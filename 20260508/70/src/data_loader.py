import pandas as pd
import numpy as np
from typing import Tuple, Optional, Dict, List
import io


class DataLoader:
    DATE_KEYWORDS = ['date', '日期', '时间', 'dt', 'day', '日期时间', '交易日期']
    SALES_KEYWORDS = ['sales', '销售额', '销量', '销售', 'amount', 'revenue', '营业额', '销售金额']
    PROMO_KEYWORDS = ['promo', 'promotion', '促销', '是否促销', '折扣', '优惠', 'is_promo', 'promotion_flag']

    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.column_mapping: Dict[str, str] = {}

    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        mapping = {}
        columns = df.columns.tolist()

        for col in columns:
            col_lower = str(col).lower().strip()
            if 'date' not in mapping:
                for kw in self.DATE_KEYWORDS:
                    if kw.lower() in col_lower:
                        mapping['date'] = col
                        break
            if 'sales' not in mapping:
                for kw in self.SALES_KEYWORDS:
                    if kw.lower() in col_lower:
                        mapping['sales'] = col
                        break
            if 'promo' not in mapping:
                for kw in self.PROMO_KEYWORDS:
                    if kw.lower() in col_lower:
                        mapping['promo'] = col
                        break

        if 'date' not in mapping and len(columns) > 0:
            for col in columns:
                try:
                    pd.to_datetime(df[col].iloc[:5])
                    mapping['date'] = col
                    break
                except (ValueError, TypeError):
                    continue

        if 'sales' not in mapping:
            numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
            if numeric_cols:
                for col in numeric_cols:
                    if col != mapping.get('promo', ''):
                        mapping['sales'] = col
                        break

        if 'promo' not in mapping:
            for col in columns:
                if col not in [mapping.get('date'), mapping.get('sales')]:
                    unique_vals = df[col].dropna().unique()
                    if len(unique_vals) <= 3 and all(v in [0, 1, '0', '1', '是', '否', True, False] for v in unique_vals):
                        mapping['promo'] = col
                        break

        return mapping

    def load_csv(self, file_path: str) -> pd.DataFrame:
        self.df = pd.read_csv(file_path)
        self.column_mapping = self._detect_columns(self.df)
        return self._preprocess()

    def load_from_string(self, csv_content: str) -> pd.DataFrame:
        self.df = pd.read_csv(io.StringIO(csv_content))
        self.column_mapping = self._detect_columns(self.df)
        return self._preprocess()

    def load_from_upload(self, file_storage) -> pd.DataFrame:
        content = file_storage.read().decode('utf-8')
        return self.load_from_string(content)

    def _preprocess(self) -> pd.DataFrame:
        if self.df is None:
            raise ValueError("No data loaded")

        df = self.df.copy()

        if 'date' in self.column_mapping:
            date_col = self.column_mapping['date']
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            df = df.dropna(subset=[date_col])
            df = df.sort_values(date_col)
            df = df.set_index(date_col)

        if 'sales' in self.column_mapping:
            sales_col = self.column_mapping['sales']
            df[sales_col] = pd.to_numeric(df[sales_col], errors='coerce')
            df = df.dropna(subset=[sales_col])
            df[sales_col] = df[sales_col].abs()

        if 'promo' in self.column_mapping:
            promo_col = self.column_mapping['promo']
            df[promo_col] = df[promo_col].apply(self._convert_promo)

        df = df.asfreq('D')

        if 'sales' in self.column_mapping:
            sales_col = self.column_mapping['sales']
            df[sales_col] = df[sales_col].interpolate(method='linear')

        if 'promo' in self.column_mapping:
            promo_col = self.column_mapping['promo']
            df[promo_col] = df[promo_col].fillna(0)

        self.df = df
        return df

    @staticmethod
    def _convert_promo(value) -> int:
        if pd.isna(value):
            return 0
        if isinstance(value, (int, float)):
            return 1 if value > 0 else 0
        if isinstance(value, str):
            value_lower = value.lower()
            if value_lower in ['是', 'true', 'yes', '1', '有', '促销']:
                return 1
            return 0
        return 1 if value else 0

    def get_time_series(self) -> pd.Series:
        if self.df is None or 'sales' not in self.column_mapping:
            raise ValueError("Data not properly loaded")
        return self.df[self.column_mapping['sales']]

    def get_promo_series(self) -> Optional[pd.Series]:
        if self.df is None or 'promo' not in self.column_mapping:
            return None
        return self.df[self.column_mapping['promo']]

    def get_column_info(self) -> Dict[str, str]:
        info = {
            'date_column': self.column_mapping.get('date', '未检测到'),
            'sales_column': self.column_mapping.get('sales', '未检测到'),
            'promo_column': self.column_mapping.get('promo', '未检测到'),
        }
        if self.df is not None:
            info['total_rows'] = str(len(self.df))
            info['date_range'] = f"{self.df.index.min().strftime('%Y-%m-%d')} 至 {self.df.index.max().strftime('%Y-%m-%d')}"
        return info

    def generate_future_promo(self, periods: int, promo_dates: Optional[List[str]] = None) -> pd.DataFrame:
        if self.df is None:
            raise ValueError("No data loaded")

        last_date = self.df.index.max()
        future_dates = pd.date_range(start=last_date + pd.Timedelta(days=1), periods=periods, freq='D')

        future_df = pd.DataFrame(index=future_dates)

        if 'promo' in self.column_mapping:
            future_df[self.column_mapping['promo']] = 0
            if promo_dates:
                for promo_date in promo_dates:
                    try:
                        dt = pd.to_datetime(promo_date)
                        if dt in future_df.index:
                            future_df.loc[dt, self.column_mapping['promo']] = 1
                    except ValueError:
                        continue

        return future_df

    def validate(self) -> Tuple[bool, List[str]]:
        errors = []
        if self.df is None:
            errors.append("未加载数据")
            return False, errors

        if 'date' not in self.column_mapping:
            errors.append("未检测到日期列")
        if 'sales' not in self.column_mapping:
            errors.append("未检测到销售额列")

        if self.df is not None and 'sales' in self.column_mapping:
            sales_col = self.column_mapping['sales']
            if len(self.df) < 30:
                errors.append(f"数据量较少（{len(self.df)}条），建议至少30条历史数据以获得更准确的预测")
            if self.df[sales_col].sum() == 0:
                errors.append("销售额数据全为0")

        return len(errors) == 0, errors
