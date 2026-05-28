import plotly
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.express as px
import json


def occupancy_line_chart(daily_occupancy, title='每日入住率趋势'):
    if daily_occupancy.empty:
        fig = go.Figure()
        fig.update_layout(title=title + '（无数据）')
        return json.loads(plotly.io.to_json(fig))
    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=daily_occupancy['日期'],
        y=daily_occupancy['入住率'],
        mode='lines',
        name='入住率(%)',
        line=dict(color='#2563eb', width=2),
        fill='tozeroy',
        fillcolor='rgba(37,99,235,0.1)'
    ))
    fig.update_layout(
        title=title,
        xaxis_title='日期',
        yaxis_title='入住率(%)',
        template='plotly_white',
        height=400,
        margin=dict(l=60, r=30, t=50, b=50)
    )
    return json.loads(plotly.io.to_json(fig))


def channel_trend_line_chart(trend_df, title='各渠道贡献占比趋势'):
    if trend_df.empty:
        fig = go.Figure()
        fig.update_layout(title=title + '（无数据）')
        return json.loads(plotly.io.to_json(fig))
    fig = go.Figure()
    channels = trend_df['客户来源渠道'].unique()
    colors = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea']
    for i, channel in enumerate(channels):
        channel_data = trend_df[trend_df['客户来源渠道'] == channel]
        fig.add_trace(go.Scatter(
            x=channel_data['月份'],
            y=channel_data['订单数'],
            mode='lines+markers',
            name=channel,
            line=dict(color=colors[i % len(colors)], width=2)
        ))
    fig.update_layout(
        title=title,
        xaxis_title='月份',
        yaxis_title='订单数',
        template='plotly_white',
        height=400,
        margin=dict(l=60, r=30, t=50, b=50)
    )
    return json.loads(plotly.io.to_json(fig))


def season_bar_chart(season_stats, title='淡旺季对比'):
    if season_stats.empty:
        fig = go.Figure()
        fig.update_layout(title=title + '（无数据）')
        return json.loads(plotly.io.to_json(fig))
    season_order = ['淡季', '平季', '旺季']
    season_stats_sorted = season_stats.set_index('季节').reindex(
        [s for s in season_order if s in season_stats['季节'].values]
    ).reset_index()
    fig = make_subplots(
        rows=2, cols=2,
        subplot_titles=('订单数', '总收入', '平均价格', '平均入住天数')
    )
    colors_map = {'淡季': '#60a5fa', '平季': '#34d399', '旺季': '#f87171'}
    bar_colors = [colors_map.get(s, '#94a3b8') for s in season_stats_sorted['季节']]
    fig.add_trace(go.Bar(
        x=season_stats_sorted['季节'],
        y=season_stats_sorted['订单数'],
        marker_color=bar_colors,
        showlegend=False
    ), row=1, col=1)
    fig.add_trace(go.Bar(
        x=season_stats_sorted['季节'],
        y=season_stats_sorted['总收入'],
        marker_color=bar_colors,
        showlegend=False
    ), row=1, col=2)
    fig.add_trace(go.Bar(
        x=season_stats_sorted['季节'],
        y=season_stats_sorted['平均价格'],
        marker_color=bar_colors,
        showlegend=False
    ), row=2, col=1)
    fig.add_trace(go.Bar(
        x=season_stats_sorted['季节'],
        y=season_stats_sorted['平均入住天数'],
        marker_color=bar_colors,
        showlegend=False
    ), row=2, col=2)
    fig.update_layout(
        title=title,
        template='plotly_white',
        height=500,
        margin=dict(l=60, r=30, t=60, b=50)
    )
    return json.loads(plotly.io.to_json(fig))


def channel_pie_chart(channel_stats, title='渠道订单占比'):
    if channel_stats.empty:
        fig = go.Figure()
        fig.update_layout(title=title + '（无数据）')
        return json.loads(plotly.io.to_json(fig))
    fig = go.Figure(data=[go.Pie(
        labels=channel_stats['渠道'],
        values=channel_stats['订单数'],
        hole=0.4,
        marker=dict(colors=['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea'])
    )])
    fig.update_layout(
        title=title,
        template='plotly_white',
        height=400,
        margin=dict(l=30, r=30, t=50, b=50)
    )
    return json.loads(plotly.io.to_json(fig))


def room_type_bar_chart(room_stats, title='房间类型统计'):
    if room_stats.empty:
        fig = go.Figure()
        fig.update_layout(title=title + '（无数据）')
        return json.loads(plotly.io.to_json(fig))
    fig = make_subplots(
        rows=1, cols=2,
        subplot_titles=('订单数', '总收入')
    )
    colors = ['#2563eb', '#dc2626', '#16a34a']
    fig.add_trace(go.Bar(
        x=room_stats['房间类型'],
        y=room_stats['订单数'],
        marker_color=colors[:len(room_stats)],
        showlegend=False
    ), row=1, col=1)
    fig.add_trace(go.Bar(
        x=room_stats['房间类型'],
        y=room_stats['总收入'],
        marker_color=colors[:len(room_stats)],
        showlegend=False
    ), row=1, col=2)
    fig.update_layout(
        title=title,
        template='plotly_white',
        height=400,
        margin=dict(l=60, r=30, t=60, b=50)
    )
    return json.loads(plotly.io.to_json(fig))


def avg_stay_bar_chart(monthly_stay, title='月度平均入住时长'):
    if monthly_stay.empty:
        fig = go.Figure()
        fig.update_layout(title=title + '（无数据）')
        return json.loads(plotly.io.to_json(fig))
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=monthly_stay['月份'].astype(str),
        y=monthly_stay['平均入住时长'],
        marker_color='#2563eb',
        showlegend=False
    ))
    fig.update_layout(
        title=title,
        xaxis_title='月份',
        yaxis_title='平均入住时长(天)',
        template='plotly_white',
        height=400,
        margin=dict(l=60, r=30, t=50, b=50)
    )
    return json.loads(plotly.io.to_json(fig))
