import pandas as pd
from date_utils import get_date_range


TOTAL_ROOMS = 50


def calc_daily_occupancy(df):
    if df.empty:
        return pd.DataFrame(columns=['日期', '入住房间数', '入住率'])
    date_range = get_date_range(df)
    occupancy_data = []
    for date in date_range:
        occupied = 0
        for _, row in df.iterrows():
            if row['入住日期'] <= date < row['退房日期']:
                occupied += 1
        rate = round(occupied / TOTAL_ROOMS * 100, 2)
        occupancy_data.append({
            '日期': date,
            '入住房间数': occupied,
            '入住率': rate
        })
    result = pd.DataFrame(occupancy_data)
    result['日期'] = pd.to_datetime(result['日期'])
    return result


def calc_monthly_avg_occupancy(daily_occupancy):
    if daily_occupancy.empty:
        return pd.DataFrame(columns=['月份', '平均入住率'])
    daily_occupancy['月份'] = daily_occupancy['日期'].dt.to_period('M')
    monthly = daily_occupancy.groupby('月份')['入住率'].mean().reset_index()
    monthly.columns = ['月份', '平均入住率']
    monthly['平均入住率'] = monthly['平均入住率'].round(2)
    return monthly


def calc_avg_stay(df):
    if df.empty:
        return 0
    return round(df['入住时长'].mean(), 2)


def calc_monthly_avg_stay(df):
    if df.empty:
        return pd.DataFrame(columns=['月份', '平均入住时长'])
    df_copy = df.copy()
    df_copy['月份'] = df_copy['入住日期'].dt.to_period('M')
    monthly = df_copy.groupby('月份')['入住时长'].mean().reset_index()
    monthly.columns = ['月份', '平均入住时长']
    monthly['平均入住时长'] = monthly['平均入住时长'].round(2)
    return monthly
