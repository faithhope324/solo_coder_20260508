import pandas as pd
from datetime import datetime, timedelta


def load_orders(csv_path):
    df = pd.read_csv(csv_path, encoding='utf-8')
    df['入住日期'] = pd.to_datetime(df['入住日期'])
    df['退房日期'] = pd.to_datetime(df['退房日期'])
    df['入住时长'] = (df['退房日期'] - df['入住日期']).dt.days
    return df


def filter_by_month(df, year_month=None):
    if year_month is None or year_month == '':
        return df
    try:
        year, month = year_month.split('-')
        year = int(year)
        month = int(month)
    except (ValueError, AttributeError):
        return df
    mask = (df['入住日期'].dt.year == year) & (df['入住日期'].dt.month == month)
    return df[mask]


def get_date_range(df):
    start = df['入住日期'].min()
    end = df['退房日期'].max()
    return pd.date_range(start=start, end=end, freq='D')


def get_season(month):
    if month in (3, 4, 5):
        return '春季'
    elif month in (6, 7, 8):
        return '夏季'
    elif month in (9, 10, 11):
        return '秋季'
    else:
        return '冬季'


def get_peak_off_peak(month):
    if month in (5, 7, 8, 10):
        return '旺季'
    elif month in (1, 2, 3, 11, 12):
        return '淡季'
    else:
        return '平季'


def get_available_months(df):
    months = df['入住日期'].dt.to_period('M').unique()
    return sorted([str(m) for m in months])
