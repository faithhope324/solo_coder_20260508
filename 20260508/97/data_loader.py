import pandas as pd
import os


REQUIRED_COLUMNS = ['order_id', 'return_reason', 'product_category',
                    'price_range', 'purchase_season', 'quantity', 'return_date']

VALID_SEASONS = ['春季', '夏季', '秋季', '冬季']
VALID_REASONS = ['尺码不合', '色差严重', '质量瑕疵', '与描述不符',
                '物流损坏', '不喜欢', '包装破损']
VALID_CATEGORIES = ['服装', '电子产品', '家居用品', '食品']
VALID_PRICE_RANGES = ['0-100', '100-200', '200-500', '500-1000', '1000以上']


def load_data(filepath):
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"数据文件不存在: {filepath}")
    df = pd.read_csv(filepath, dtype=str)
    return df


def clean_data(df):
    df = df.copy()

    missing_cols = [col for col in REQUIRED_COLUMNS if col not in df.columns]
    if missing_cols:
        raise ValueError(f"缺少必要列: {missing_cols}")

    df = df.dropna(subset=REQUIRED_COLUMNS)

    df['quantity'] = pd.to_numeric(df['quantity'], errors='coerce')
    df = df.dropna(subset=['quantity'])
    df['quantity'] = df['quantity'].astype(int)

    df['return_date'] = pd.to_datetime(df['return_date'], errors='coerce')
    df = df.dropna(subset=['return_date'])

    df = df[df['purchase_season'].isin(VALID_SEASONS)]
    df = df[df['return_reason'].isin(VALID_REASONS)]
    df = df[df['product_category'].isin(VALID_CATEGORIES)]
    df = df[df['price_range'].isin(VALID_PRICE_RANGES)]

    df = df.drop_duplicates(subset=['order_id'])

    df = df.reset_index(drop=True)
    return df


def get_data_summary(df):
    summary = {
        'total_records': len(df),
        'total_quantity': int(df['quantity'].sum()),
        'categories': sorted(df['product_category'].unique().tolist()),
        'seasons': sorted(df['purchase_season'].unique().tolist()),
        'price_ranges': sorted(df['price_range'].unique().tolist(),
                              key=lambda x: VALID_PRICE_RANGES.index(x)
                              if x in VALID_PRICE_RANGES else 999),
        'reasons': sorted(df['return_reason'].unique().tolist()),
        'date_range': {
            'start': df['return_date'].min().strftime('%Y-%m-%d'),
            'end': df['return_date'].max().strftime('%Y-%m-%d'),
        }
    }
    return summary
