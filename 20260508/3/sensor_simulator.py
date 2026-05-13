import random
import threading
import time
from collections import deque


class SensorSimulator:
    def __init__(self):
        self.sensors = {
            'temperature': {
                'name': '温度',
                'unit': '°C',
                'min_value': -10,
                'max_value': 50,
                'initial_value': 25,
                'step_range': (-0.5, 0.5)
            },
            'humidity': {
                'name': '湿度',
                'unit': '%',
                'min_value': 0,
                'max_value': 100,
                'initial_value': 50,
                'step_range': (-1, 1)
            },
            'pressure': {
                'name': '压力',
                'unit': 'hPa',
                'min_value': 980,
                'max_value': 1050,
                'initial_value': 1013,
                'step_range': (-0.3, 0.3)
            }
        }
        
        self.current_values = {
            sensor_id: config['initial_value']
            for sensor_id, config in self.sensors.items()
        }
        
        self.chart_history = {
            sensor_id: deque(maxlen=100)
            for sensor_id in self.sensors.keys()
        }
        
        self.chart_timestamps = deque(maxlen=100)
        self._lock = threading.Lock()
        self._running = False
        self._value_thread = None
        self._chart_thread = None
        self._value_update_interval = 0.5
        self._chart_update_interval = 60

    def _generate_next_value(self, sensor_id):
        config = self.sensors[sensor_id]
        current = self.current_values[sensor_id]
        step = random.uniform(*config['step_range'])
        new_value = current + step
        
        new_value = max(config['min_value'], min(config['max_value'], new_value))
        return round(new_value, 2)

    def _value_update_loop(self):
        while self._running:
            with self._lock:
                for sensor_id in self.sensors.keys():
                    new_value = self._generate_next_value(sensor_id)
                    self.current_values[sensor_id] = new_value
            
            time.sleep(self._value_update_interval)

    def _chart_update_loop(self):
        while self._running:
            timestamp = time.strftime('%H:%M:%S', time.localtime())
            
            with self._lock:
                self.chart_timestamps.append(timestamp)
                
                for sensor_id in self.sensors.keys():
                    self.chart_history[sensor_id].append(self.current_values[sensor_id])
            
            time.sleep(self._chart_update_interval)

    def start(self):
        if not self._running:
            self._running = True
            self._value_thread = threading.Thread(target=self._value_update_loop, daemon=True)
            self._value_thread.start()
            self._chart_thread = threading.Thread(target=self._chart_update_loop, daemon=True)
            self._chart_thread.start()

    def stop(self):
        self._running = False
        if self._value_thread:
            self._value_thread.join()
        if self._chart_thread:
            self._chart_thread.join()

    def get_sensor_list(self):
        return [
            {'id': sensor_id, 'name': config['name']}
            for sensor_id, config in self.sensors.items()
        ]

    def get_sensor_info(self, sensor_id):
        if sensor_id in self.sensors:
            config = self.sensors[sensor_id]
            return {
                'id': sensor_id,
                'name': config['name'],
                'unit': config['unit'],
                'min_value': config['min_value'],
                'max_value': config['max_value'],
                'current_value': self.current_values[sensor_id]
            }
        return None

    def get_sensor_data(self, sensor_id):
        if sensor_id in self.sensors:
            with self._lock:
                return {
                    'sensor_id': sensor_id,
                    'name': self.sensors[sensor_id]['name'],
                    'unit': self.sensors[sensor_id]['unit'],
                    'current_value': self.current_values[sensor_id],
                    'timestamps': list(self.chart_timestamps),
                    'values': list(self.chart_history[sensor_id])
                }
        return None

    def get_all_current_values(self):
        with self._lock:
            return {
                sensor_id: {
                    'name': config['name'],
                    'unit': config['unit'],
                    'value': self.current_values[sensor_id]
                }
                for sensor_id, config in self.sensors.items()
            }
