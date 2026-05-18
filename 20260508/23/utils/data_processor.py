import pandas as pd
import numpy as np
from typing import Tuple, Dict, List


class DataProcessor:
    @staticmethod
    def load_csv(file_path: str) -> pd.DataFrame:
        df = pd.read_csv(file_path)
        return df

    @staticmethod
    def validate_data(df: pd.DataFrame) -> Tuple[bool, str]:
        if df.shape[1] < 2:
            return False, "CSV文件必须包含至少两列数据"
        
        date_col = None
        value_col = None
        
        for col in df.columns:
            if date_col is None:
                try:
                    pd.to_datetime(df[col])
                    date_col = col
                except (ValueError, TypeError):
                    pass
        
        if date_col is None:
            return False, "未找到日期列，请确保第一列为日期格式"
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            return False, "未找到数值列，请确保CSV包含数值数据"
        
        if date_col in numeric_cols:
            numeric_cols = numeric_cols.drop(date_col)
        
        if len(numeric_cols) == 0:
            return False, "未找到有效的数值列"
        
        value_col = numeric_cols[0]
        
        return True, f"找到日期列: {date_col}, 数值列: {value_col}"

    @staticmethod
    def preprocess(df: pd.DataFrame) -> pd.DataFrame:
        date_col = None
        value_col = None
        
        for col in df.columns:
            if date_col is None:
                try:
                    pd.to_datetime(df[col])
                    date_col = col
                except (ValueError, TypeError):
                    pass
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if date_col in numeric_cols:
            numeric_cols = numeric_cols.drop(date_col)
        value_col = numeric_cols[0]
        
        processed_df = pd.DataFrame()
        processed_df['date'] = pd.to_datetime(df[date_col])
        processed_df['value'] = pd.to_numeric(df[value_col], errors='coerce')
        
        processed_df = processed_df.dropna()
        processed_df = processed_df.sort_values('date')
        processed_df = processed_df.reset_index(drop=True)
        
        return processed_df

    @staticmethod
    def split_train_test(df: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
        split_idx = int(len(df) * (1 - test_size))
        train_df = df.iloc[:split_idx].copy()
        test_df = df.iloc[split_idx:].copy()
        return train_df, test_df

    @staticmethod
    def get_preview(df: pd.DataFrame, n_rows: int = 5) -> List[Dict]:
        preview = df.head(n_rows).copy()
        preview['date'] = preview['date'].dt.strftime('%Y-%m-%d')
        return preview.to_dict('records')

    @staticmethod
    def infer_frequency(df: pd.DataFrame) -> str:
        dates = df['date']
        if len(dates) < 2:
            return 'D'
        
        diffs = dates.diff().dropna()
        median_diff = diffs.median()
        
        days = median_diff.days
        if days <= 1:
            return 'D'
        elif days <= 7:
            return 'W'
        elif days <= 31:
            return 'M'
        elif days <= 92:
            return 'Q'
        else:
            return 'Y'

    @staticmethod
    def calculate_metrics(actual: np.ndarray, predicted: np.ndarray) -> Dict[str, float]:
        mask = ~np.isnan(actual) & ~np.isnan(predicted)
        actual = actual[mask]
        predicted = predicted[mask]
        
        if len(actual) == 0:
            return {'rmse': 0.0, 'mae': 0.0, 'mape': 0.0}
        
        rmse = np.sqrt(np.mean((actual - predicted) ** 2))
        mae = np.mean(np.abs(actual - predicted))
        
        non_zero_mask = actual != 0
        if np.any(non_zero_mask):
            mape = np.mean(np.abs((actual[non_zero_mask] - predicted[non_zero_mask]) / actual[non_zero_mask])) * 100
        else:
            mape = 0.0
        
        return {
            'rmse': round(float(rmse), 4),
            'mae': round(float(mae), 4),
            'mape': round(float(mape), 4)
        }
