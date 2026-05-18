import os
import sys
import glob
import json
import torch
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from data_processing.data_loader import TrafficDataProcessor
from model.lstm_model import TrafficLSTM, load_model


class PredictionService:
    def __init__(self, model_dir: str = 'saved_models', device: str = 'cpu'):
        self.model_dir = model_dir
        self.device = device
        self.models: Dict[str, Tuple[TrafficLSTM, Dict]] = {}
        self.intersection_ids: List[str] = []
        self.data_processor = TrafficDataProcessor()
        self._load_models()

    def _load_models(self) -> None:
        if not os.path.exists(self.model_dir):
            print(f"模型目录 {self.model_dir} 不存在，跳过模型加载")
            return
        model_files = glob.glob(os.path.join(self.model_dir, 'lstm_*.pth'))
        for model_file in model_files:
            try:
                model, checkpoint = load_model(model_file, self.device)
                intersection_id = checkpoint.get('intersection_id', os.path.basename(model_file).split('_')[1])
                self.models[intersection_id] = (model, checkpoint)
                if intersection_id not in self.intersection_ids:
                    self.intersection_ids.append(intersection_id)
                print(f"已加载模型: {intersection_id}")
            except Exception as e:
                print(f"加载模型失败 {model_file}: {e}")
        self.intersection_ids.sort()
        print(f"共加载 {len(self.models)} 个模型")

    def get_intersection_ids(self) -> List[str]:
        return self.intersection_ids

    def get_model_info(self, intersection_id: str) -> Optional[Dict]:
        if intersection_id not in self.models:
            return None
        _, checkpoint = self.models[intersection_id]
        return {
            'intersection_id': checkpoint.get('intersection_id'),
            'hyperparams': checkpoint.get('hyperparams', {}),
            'training_history': checkpoint.get('training_history', {}),
            'timestamp': checkpoint.get('timestamp')
        }

    def _prepare_prediction_sequence(self, df: pd.DataFrame, intersection_id: str, seq_length: int, target_time: datetime) -> Optional[np.ndarray]:
        df_int = df[df['intersection_id'] == intersection_id].copy()
        df_int = df_int.sort_values('timestamp').reset_index(drop=True)
        if len(df_int) < seq_length:
            return None
        target_time = pd.Timestamp(target_time)
        df_before = df_int[df_int['timestamp'] < target_time]
        if len(df_before) < seq_length:
            return None
        recent_data = df_before.tail(seq_length)
        traffic_values = recent_data['traffic_volume'].values.reshape(-1, 1)
        scaler = self.data_processor.intersection_scalers.get(intersection_id)
        if scaler is None:
            _, scaler = self.data_processor.preprocess_for_intersection(df, intersection_id)
        scaled_data = scaler.transform(traffic_values)
        return scaled_data.reshape(1, seq_length, 1)

    def predict_next_hour(self, df: pd.DataFrame, intersection_id: str, target_time: datetime) -> Optional[Dict]:
        if intersection_id not in self.models:
            return {'error': f'未找到路口 {intersection_id} 的模型'}
        model, checkpoint = self.models[intersection_id]
        hyperparams = checkpoint.get('hyperparams', {})
        seq_length = hyperparams.get('seq_length', 24)
        input_sequence = self._prepare_prediction_sequence(df, intersection_id, seq_length, target_time)
        if input_sequence is None:
            return {'error': f'数据不足，无法进行预测（需要至少 {seq_length} 条历史数据）'}
        model.eval()
        with torch.no_grad():
            input_tensor = torch.FloatTensor(input_sequence).to(self.device)
            prediction_scaled = model(input_tensor).cpu().numpy()
        scaler = self.data_processor.intersection_scalers.get(intersection_id)
        if scaler is None:
            _, scaler = self.data_processor.preprocess_for_intersection(df, intersection_id)
        prediction_value = scaler.inverse_transform(prediction_scaled)[0][0]
        prediction_value = max(0, int(round(prediction_value)))
        return {
            'intersection_id': intersection_id,
            'prediction_time': target_time.strftime('%Y-%m-%d %H:%M:%S'),
            'predicted_traffic': prediction_value,
            'model_info': {
                'seq_length': seq_length,
                'hidden_size': hyperparams.get('hidden_size'),
                'num_layers': hyperparams.get('num_layers')
            }
        }

    def predict_next_hours(self, df: pd.DataFrame, intersection_id: str, start_time: datetime, hours: int = 24) -> Dict:
        predictions = []
        current_time = start_time
        for i in range(hours):
            result = self.predict_next_hour(df, intersection_id, current_time)
            if 'error' in result:
                return result
            predictions.append(result)
            current_time = current_time + timedelta(hours=1)
        return {
            'intersection_id': intersection_id,
            'start_time': start_time.strftime('%Y-%m-%d %H:%M:%S'),
            'end_time': (start_time + timedelta(hours=hours-1)).strftime('%Y-%m-%d %H:%M:%S'),
            'predictions': predictions
        }

    def get_historical_data(self, df: pd.DataFrame, intersection_id: str, hours: int = 168) -> List[Dict]:
        df_int = df[df['intersection_id'] == intersection_id].copy()
        df_int = df_int.sort_values('timestamp', ascending=False).head(hours)
        df_int = df_int.sort_values('timestamp').reset_index(drop=True)
        return [
            {
                'timestamp': row['timestamp'].strftime('%Y-%m-%d %H:%M:%S'),
                'traffic_volume': int(row['traffic_volume'])
            }
            for _, row in df_int.iterrows()
        ]

    def get_available_prediction_times(self, df: pd.DataFrame, intersection_id: str) -> List[str]:
        seq_length = 24
        if intersection_id in self.models:
            _, checkpoint = self.models[intersection_id]
            seq_length = checkpoint.get('hyperparams', {}).get('seq_length', 24)
        df_int = df[df['intersection_id'] == intersection_id].copy()
        df_int = df_int.sort_values('timestamp').reset_index(drop=True)
        if len(df_int) < seq_length:
            return []
        last_data_time = df_int.iloc[-1]['timestamp']
        available_times = []
        for i in range(1, 25):
            available_times.append(last_data_time + timedelta(hours=i))
        return [t.strftime('%Y-%m-%d %H:%M:%S') for t in available_times]
