import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from typing import Tuple, List, Dict
import os


class TrafficDataProcessor:
    def __init__(self, seq_length: int = 24):
        self.seq_length = seq_length
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.intersection_ids = []
        self.intersection_scalers: Dict[str, MinMaxScaler] = {}

    def load_csv(self, file_path: str) -> pd.DataFrame:
        df = pd.read_csv(file_path)
        required_columns = ['timestamp', 'intersection_id', 'traffic_volume']
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"CSV缺少必要列: {col}")
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        df = df.sort_values(['intersection_id', 'timestamp']).reset_index(drop=True)
        self.intersection_ids = sorted(df['intersection_id'].unique().tolist())
        return df

    def preprocess_for_intersection(self, df: pd.DataFrame, intersection_id: str) -> Tuple[np.ndarray, MinMaxScaler]:
        df_intersection = df[df['intersection_id'] == intersection_id].copy()
        df_intersection = df_intersection.sort_values('timestamp').reset_index(drop=True)
        traffic_values = df_intersection['traffic_volume'].values.reshape(-1, 1)
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(traffic_values)
        self.intersection_scalers[intersection_id] = scaler
        return scaled_data, scaler

    def create_sequences(self, data: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        X, y = [], []
        for i in range(len(data) - self.seq_length):
            X.append(data[i:i + self.seq_length])
            y.append(data[i + self.seq_length])
        return np.array(X), np.array(y)

    def split_data(self, X: np.ndarray, y: np.ndarray, train_ratio: float = 0.8) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        split_idx = int(len(X) * train_ratio)
        X_train, X_test = X[:split_idx], X[split_idx:]
        y_train, y_test = y[:split_idx], y[split_idx:]
        return X_train, X_test, y_train, y_test

    def inverse_transform(self, data: np.ndarray, intersection_id: str) -> np.ndarray:
        if intersection_id not in self.intersection_scalers:
            raise ValueError(f"未找到路口 {intersection_id} 的缩放器")
        scaler = self.intersection_scalers[intersection_id]
        return scaler.inverse_transform(data)

    def generate_sample_data(self, start_date: str = '2024-01-01', days: int = 30, num_intersections: int = 5) -> pd.DataFrame:
        date_rng = pd.date_range(start=start_date, periods=days * 24, freq='h')
        dfs = []
        for i in range(1, num_intersections + 1):
            intersection_id = f'INT_{i:03d}'
            base_traffic = 200 + i * 50
            traffic = []
            for dt in date_rng:
                hour = dt.hour
                day_of_week = dt.dayofweek
                hour_factor = 1.0
                if 7 <= hour <= 9:
                    hour_factor = 2.5
                elif 12 <= hour <= 14:
                    hour_factor = 1.8
                elif 17 <= hour <= 19:
                    hour_factor = 2.8
                elif 22 <= hour or hour <= 5:
                    hour_factor = 0.3
                day_factor = 0.8 if day_of_week >= 5 else 1.0
                noise = np.random.normal(0, 20)
                value = max(0, int(base_traffic * hour_factor * day_factor + noise))
                traffic.append(value)
            df_int = pd.DataFrame({
                'timestamp': date_rng,
                'intersection_id': intersection_id,
                'traffic_volume': traffic
            })
            dfs.append(df_int)
        result_df = pd.concat(dfs, ignore_index=True)
        self.intersection_ids = sorted(result_df['intersection_id'].unique().tolist())
        return result_df

    def save_sample_data(self, output_path: str, **kwargs) -> None:
        df = self.generate_sample_data(**kwargs)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        df.to_csv(output_path, index=False)
        print(f"示例数据已保存到 {output_path}，共 {len(df)} 条记录")
