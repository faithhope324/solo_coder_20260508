import numpy as np
from dataclasses import dataclass, field
from typing import List, Dict, Optional

@dataclass
class SignalPhase:
    name: str
    green_time: float
    yellow_time: float = 3.0
    red_time: float = 0.0

@dataclass
class Vehicle:
    arrival_time: float
    direction: str
    wait_time: float = 0.0
    passed: bool = False

@dataclass
class IntersectionConfig:
    cycle_length: float = 120.0
    phases: List[SignalPhase] = field(default_factory=list)
    saturation_flow: float = 0.8

class TrafficSimulationEngine:
    def __init__(self, config: Optional[IntersectionConfig] = None):
        self.config = config or IntersectionConfig()
        self._initialize_phases()
    
    def _initialize_phases(self):
        if not self.config.phases:
            self.config.phases = [
                SignalPhase(name='南北直行', green_time=30, yellow_time=3, red_time=0),
                SignalPhase(name='南北左转', green_time=20, yellow_time=3, red_time=0),
                SignalPhase(name='东西直行', green_time=30, yellow_time=3, red_time=0),
                SignalPhase(name='东西左转', green_time=20, yellow_time=3, red_time=0)
            ]
        self._update_red_times()
        self._update_cycle_length()
    
    def _update_red_times(self):
        total_green_yellow = sum(p.green_time + p.yellow_time for p in self.config.phases)
        for phase in self.config.phases:
            phase.red_time = total_green_yellow - (phase.green_time + phase.yellow_time)
    
    def _update_cycle_length(self):
        self.config.cycle_length = sum(p.green_time + p.yellow_time for p in self.config.phases)
    
    def update_signal_timing(self, phase_green_times: Dict[str, float]):
        for phase_name, green_time in phase_green_times.items():
            for phase in self.config.phases:
                if phase.name == phase_name:
                    phase.green_time = max(10, min(60, green_time))
                    break
        self._update_red_times()
        self._update_cycle_length()
    
    def get_current_phase(self, time: float) -> tuple[int, SignalPhase, str]:
        cycle_time = time % self.config.cycle_length
        elapsed = 0.0
        
        for i, phase in enumerate(self.config.phases):
            phase_duration = phase.green_time + phase.yellow_time
            if elapsed <= cycle_time < elapsed + phase.green_time:
                return i, phase, 'green'
            elif elapsed + phase.green_time <= cycle_time < elapsed + phase_duration:
                return i, phase, 'yellow'
            elapsed += phase_duration
        
        return 0, self.config.phases[0], 'red'
    
    def generate_arrivals(self, predicted_flows: List[float], directions: List[str], time_horizon: float = 1800.0) -> List[Vehicle]:
        vehicles = []
        interval = time_horizon / len(predicted_flows)
        
        for i, flow_rate in enumerate(predicted_flows):
            time_start = i * interval
            time_end = (i + 1) * interval
            
            n_vehicles = int(np.random.poisson(flow_rate * (interval / 3600.0)))
            
            for _ in range(n_vehicles):
                arrival_time = time_start + np.random.uniform(0, interval)
                direction = np.random.choice(directions)
                vehicles.append(Vehicle(arrival_time=arrival_time, direction=direction))
        
        vehicles.sort(key=lambda v: v.arrival_time)
        return vehicles
    
    def get_phase_for_direction(self, direction: str) -> int:
        direction_map = {
            'north_south_straight': 0,
            'north_south_left': 1,
            'east_west_straight': 2,
            'east_west_left': 3
        }
        return direction_map.get(direction, 0)
    
    def simulate(self, predicted_flows: List[float], time_horizon: float = 1800.0) -> Dict:
        directions = ['north_south_straight', 'north_south_left', 'east_west_straight', 'east_west_left']
        vehicles = self.generate_arrivals(predicted_flows, directions, time_horizon)
        
        queues: Dict[int, List[Vehicle]] = {0: [], 1: [], 2: [], 3: []}
        wait_times = []
        throughput = 0
        
        time = 0.0
        time_step = 0.5
        saturation = self.config.saturation_flow
        
        while time < time_horizon:
            phase_idx, phase, light_state = self.get_current_phase(time)
            
            while vehicles and vehicles[0].arrival_time <= time:
                vehicle = vehicles.pop(0)
                v_phase = self.get_phase_for_direction(vehicle.direction)
                queues[v_phase].append(vehicle)
            
            if light_state == 'green':
                can_pass = int(saturation / time_step)
                if queues[phase_idx]:
                    to_pass = min(can_pass, len(queues[phase_idx]))
                    for _ in range(to_pass):
                        vehicle = queues[phase_idx].pop(0)
                        vehicle.wait_time = time - vehicle.arrival_time
                        vehicle.passed = True
                        wait_times.append(vehicle.wait_time)
                        throughput += 1
            
            for phase_q in queues.values():
                for v in phase_q:
                    if time >= v.arrival_time:
                        v.wait_time += time_step
            
            time += time_step
        
        for phase_q in queues.values():
            for v in phase_q:
                wait_times.append(v.wait_time)
        
        if wait_times:
            avg_wait = np.mean(wait_times)
            max_wait = np.max(wait_times)
            total_wait = np.sum(wait_times)
        else:
            avg_wait = 0.0
            max_wait = 0.0
            total_wait = 0.0
        
        queue_lengths = [len(q) for q in queues.values()]
        avg_queue = np.mean(queue_lengths) if queue_lengths else 0.0
        
        return {
            'average_wait_time': float(avg_wait),
            'max_wait_time': float(max_wait),
            'total_wait_time': float(total_wait),
            'throughput': int(throughput),
            'average_queue_length': float(avg_queue),
            'total_vehicles': len(wait_times),
            'cycle_length': self.config.cycle_length
        }

def evaluate_signal_timing(base_green_times: Dict[str, float], 
                           optimized_green_times: Dict[str, float],
                           predicted_flows: List[float]) -> Dict:
    
    engine = TrafficSimulationEngine()
    engine.update_signal_timing(base_green_times)
    base_results = engine.simulate(predicted_flows)
    
    engine.update_signal_timing(optimized_green_times)
    optimized_results = engine.simulate(predicted_flows)
    
    improvements = {}
    for key in base_results:
        if isinstance(base_results[key], (int, float)) and base_results[key] != 0:
            if 'wait' in key or 'queue' in key:
                improvements[key] = ((base_results[key] - optimized_results[key]) / base_results[key]) * 100
            elif key == 'throughput':
                improvements[key] = ((optimized_results[key] - base_results[key]) / base_results[key]) * 100
            else:
                improvements[key] = 0.0
    
    return {
        'baseline': base_results,
        'optimized': optimized_results,
        'improvements': improvements
    }
