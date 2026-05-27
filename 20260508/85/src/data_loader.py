import pandas as pd
import numpy as np
from datetime import datetime
import os

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'customer_reviews.csv')

def load_data(filepath=None):
    if filepath is None:
        filepath = DATA_PATH
    
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"数据文件不存在: {filepath}")
    
    try:
        df = pd.read_csv(filepath, encoding='utf-8-sig')
        print(f"成功加载数据，共 {len(df)} 条记录")
        return df
    except Exception as e:
        raise Exception(f"加载数据失败: {str(e)}")

def clean_data(df):
    if df is None or len(df) == 0:
        raise ValueError("数据为空，无法进行清洗")
    
    df_cleaned = df.copy()
    
    required_columns = ['review_id', 'review_date', 'rating', 'wait_time', 'taste', 'service', 'comment']
    missing_columns = [col for col in required_columns if col not in df_cleaned.columns]
    if missing_columns:
        raise ValueError(f"缺少必要列: {missing_columns}")
    
    df_cleaned = df_cleaned.drop_duplicates(subset=['review_id'], keep='first')
    
    df_cleaned['review_date'] = pd.to_datetime(df_cleaned['review_date'], errors='coerce')
    invalid_dates = df_cleaned['review_date'].isna().sum()
    if invalid_dates > 0:
        df_cleaned = df_cleaned.dropna(subset=['review_date'])
        print(f"移除了 {invalid_dates} 条日期无效的记录")
    
    numeric_columns = ['rating', 'wait_time', 'taste', 'service']
    for col in numeric_columns:
        df_cleaned[col] = pd.to_numeric(df_cleaned[col], errors='coerce')
    
    df_cleaned['rating'] = df_cleaned['rating'].fillna(df_cleaned['rating'].median())
    df_cleaned['wait_time'] = df_cleaned['wait_time'].fillna(df_cleaned['wait_time'].median())
    df_cleaned['taste'] = df_cleaned['taste'].fillna(df_cleaned['taste'].median())
    df_cleaned['service'] = df_cleaned['service'].fillna(df_cleaned['service'].median())
    
    df_cleaned = df_cleaned[
        (df_cleaned['rating'] >= 1) & (df_cleaned['rating'] <= 5) &
        (df_cleaned['wait_time'] >= 0) & (df_cleaned['wait_time'] <= 120) &
        (df_cleaned['taste'] >= 1) & (df_cleaned['taste'] <= 5) &
        (df_cleaned['service'] >= 1) & (df_cleaned['service'] <= 5)
    ]
    
    df_cleaned['comment'] = df_cleaned['comment'].fillna('')
    df_cleaned['comment'] = df_cleaned['comment'].astype(str)
    df_cleaned['comment'] = df_cleaned['comment'].str.strip()
    
    df_cleaned = df_cleaned.sort_values('review_date').reset_index(drop=True)
    
    print(f"数据清洗完成，剩余 {len(df_cleaned)} 条有效记录")
    return df_cleaned

def filter_by_date(df, start_date=None, end_date=None):
    if df is None or len(df) == 0:
        return df
    
    df_filtered = df.copy()
    
    if start_date:
        if isinstance(start_date, str):
            start_date = pd.to_datetime(start_date)
        df_filtered = df_filtered[df_filtered['review_date'] >= start_date]
    
    if end_date:
        if isinstance(end_date, str):
            end_date = pd.to_datetime(end_date)
            end_date = end_date + pd.Timedelta(days=1) - pd.Timedelta(seconds=1)
        df_filtered = df_filtered[df_filtered['review_date'] <= end_date]
    
    return df_filtered.reset_index(drop=True)

def get_date_range(df):
    if df is None or len(df) == 0:
        return None, None
    min_date = df['review_date'].min().strftime('%Y-%m-%d')
    max_date = df['review_date'].max().strftime('%Y-%m-%d')
    return min_date, max_date
