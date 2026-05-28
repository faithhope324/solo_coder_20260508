import pandas as pd
from date_utils import get_peak_off_peak


def calc_channel_contribution(df):
    if df.empty:
        return pd.DataFrame(columns=['渠道', '订单数', '订单占比', '收入', '收入占比'])
    df_copy = df.copy()
    df_copy['总收入'] = df_copy['价格'] * df_copy['入住时长']
    channel_stats = df_copy.groupby('客户来源渠道').agg(
        订单数=('客户来源渠道', 'count'),
        收入=('总收入', 'sum')
    ).reset_index()
    channel_stats.columns = ['渠道', '订单数', '收入']
    total_orders = channel_stats['订单数'].sum()
    total_revenue = channel_stats['收入'].sum()
    channel_stats['订单占比'] = (channel_stats['订单数'] / total_orders * 100).round(2)
    channel_stats['收入占比'] = (channel_stats['收入'] / total_revenue * 100).round(2)
    channel_stats = channel_stats.sort_values('订单数', ascending=False)
    return channel_stats


def calc_channel_monthly_trend(df):
    if df.empty:
        return pd.DataFrame()
    df_copy = df.copy()
    df_copy['月份'] = df_copy['入住日期'].dt.to_period('M')
    trend = df_copy.groupby(['月份', '客户来源渠道']).size().reset_index(name='订单数')
    trend['月份'] = trend['月份'].astype(str)
    return trend


def calc_season_comparison(df):
    if df.empty:
        return pd.DataFrame(columns=['季节', '订单数', '订单数', '平均入住率', '平均价格', '总收入', '平均入住天数', '客单价'])
    df_copy = df.copy()
    df_copy['季节'] = df_copy['入住日期'].dt.month.apply(get_peak_off_peak)
    df_copy['总收入'] = df_copy['价格'] * df_copy['入住时长']
    season_stats = df_copy.groupby('季节').agg(
        订单数=('价格', 'count'),
        平均价格=('价格', 'mean'),
        总收入=('总收入', 'sum'),
        平均入住天数=('入住时长', 'mean'),
        客单价=('总收入', 'mean')
    ).reset_index()
    season_stats.columns = ['季节', '订单数', '平均价格', '总收入', '平均入住天数', '客单价']
    season_stats['平均价格'] = season_stats['平均价格'].round(2)
    season_stats['总收入'] = season_stats['总收入'].round(2)
    season_stats['平均入住天数'] = season_stats['平均入住天数'].round(2)
    season_stats['客单价'] = season_stats['客单价'].round(2)
    return season_stats


def calc_room_type_stats(df):
    if df.empty:
        return pd.DataFrame(columns=['房间类型', '订单数', '平均价格', '总收入', '平均入住天数'])
    df_copy = df.copy()
    df_copy['总收入'] = df_copy['价格'] * df_copy['入住时长']
    room_stats = df_copy.groupby('房间类型').agg(
        订单数=('价格', 'count'),
        平均价格=('价格', 'mean'),
        总收入=('总收入', 'sum'),
        平均入住天数=('入住时长', 'mean')
    ).reset_index()
    room_stats.columns = ['房间类型', '订单数', '平均价格', '总收入', '平均入住天数']
    room_stats['平均价格'] = room_stats['平均价格'].round(2)
    room_stats['总收入'] = room_stats['总收入'].round(2)
    room_stats['平均入住天数'] = room_stats['平均入住天数'].round(2)
    return room_stats
