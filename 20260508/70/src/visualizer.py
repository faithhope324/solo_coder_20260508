import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import plotly.io as pio
from typing import Optional, Dict, Any
import json


class Visualizer:
    def __init__(self):
        self.colors = {
            'historical': '#1f77b4',
            'predicted': '#ff7f0e',
            'lower': '#2ca02c',
            'upper': '#2ca02c',
            'promo': '#d62728',
            'background': '#f9f9f9',
            'grid': '#e0e0e0'
        }

    def plot_historical_trend(self, series: pd.Series, promo_series: Optional[pd.Series] = None) -> str:
        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=series.index,
            y=series.values,
            mode='lines+markers',
            name='历史销售额',
            line=dict(color=self.colors['historical'], width=2),
            marker=dict(size=4),
            hovertemplate='日期: %{x}<br>销售额: %{y:,.2f}<extra></extra>'
        ))

        if promo_series is not None:
            promo_dates = promo_series[promo_series == 1].index
            if len(promo_dates) > 0:
                promo_values = series.loc[promo_dates]
                fig.add_trace(go.Scatter(
                    x=promo_dates,
                    y=promo_values.values,
                    mode='markers',
                    name='促销日',
                    marker=dict(color=self.colors['promo'], size=10, symbol='star'),
                    hovertemplate='日期: %{x}<br>促销日<br>销售额: %{y:,.2f}<extra></extra>'
                ))

        fig.update_layout(
            title={
                'text': '历史销售趋势',
                'y': 0.95,
                'x': 0.5,
                'xanchor': 'center',
                'yanchor': 'top',
                'font': dict(size=20, color='#333')
            },
            xaxis_title='日期',
            yaxis_title='销售额',
            hovermode='x unified',
            plot_bgcolor=self.colors['background'],
            paper_bgcolor='white',
            xaxis=dict(
                showgrid=True,
                gridcolor=self.colors['grid'],
                title_font=dict(size=14),
                tickfont=dict(size=12)
            ),
            yaxis=dict(
                showgrid=True,
                gridcolor=self.colors['grid'],
                title_font=dict(size=14),
                tickfont=dict(size=12)
            ),
            legend=dict(
                x=0.01,
                y=0.99,
                bgcolor='rgba(255, 255, 255, 0.9)',
                bordercolor='#ddd',
                borderwidth=1
            ),
            margin=dict(l=60, r=40, t=80, b=60)
        )

        return pio.to_html(fig, full_html=False, include_plotlyjs=False)

    def plot_forecast(self, history: pd.Series, predictions: pd.DataFrame, promo_series: Optional[pd.Series] = None) -> str:
        fig = go.Figure()

        fig.add_trace(go.Scatter(
            x=history.index,
            y=history.values,
            mode='lines',
            name='历史销售额',
            line=dict(color=self.colors['historical'], width=2),
            hovertemplate='日期: %{x}<br>销售额: %{y:,.2f}<extra></extra>'
        ))

        last_date = history.index.max()
        extended_dates = [last_date] + list(predictions.index)
        extended_predicted = [history.iloc[-1]] + list(predictions['predicted'])
        extended_lower = [history.iloc[-1]] + list(predictions['lower'])
        extended_upper = [history.iloc[-1]] + list(predictions['upper'])

        fig.add_trace(go.Scatter(
            x=predictions.index,
            y=predictions['predicted'],
            mode='lines+markers',
            name='预测销售额',
            line=dict(color=self.colors['predicted'], width=3, dash='dash'),
            marker=dict(size=8),
            hovertemplate='日期: %{x}<br>预测: %{y:,.2f}<extra></extra>'
        ))

        fig.add_trace(go.Scatter(
            x=extended_dates,
            y=extended_upper,
            mode='lines',
            name='预测上限',
            line=dict(color=self.colors['upper'], width=1, dash='dot'),
            showlegend=True,
            hovertemplate='日期: %{x}<br>上限: %{y:,.2f}<extra></extra>'
        ))

        fig.add_trace(go.Scatter(
            x=extended_dates,
            y=extended_lower,
            mode='lines',
            name='预测下限',
            line=dict(color=self.colors['lower'], width=1, dash='dot'),
            fill='tonexty',
            fillcolor='rgba(44, 160, 44, 0.15)',
            showlegend=True,
            hovertemplate='日期: %{x}<br>下限: %{y:,.2f}<extra></extra>'
        ))

        if promo_series is not None:
            promo_dates = promo_series[promo_series == 1].index
            if len(promo_dates) > 0:
                promo_values = history.reindex(promo_dates).dropna()
                if len(promo_values) > 0:
                    fig.add_trace(go.Scatter(
                        x=promo_values.index,
                        y=promo_values.values,
                        mode='markers',
                        name='历史促销日',
                        marker=dict(color=self.colors['promo'], size=10, symbol='star'),
                        hovertemplate='日期: %{x}<br>促销日<br>销售额: %{y:,.2f}<extra></extra>'
                    ))

        fig.update_layout(
            title={
                'text': '销售预测（含95%置信区间）',
                'y': 0.95,
                'x': 0.5,
                'xanchor': 'center',
                'yanchor': 'top',
                'font': dict(size=20, color='#333')
            },
            xaxis_title='日期',
            yaxis_title='销售额',
            hovermode='x unified',
            plot_bgcolor=self.colors['background'],
            paper_bgcolor='white',
            xaxis=dict(
                showgrid=True,
                gridcolor=self.colors['grid'],
                title_font=dict(size=14),
                tickfont=dict(size=12)
            ),
            yaxis=dict(
                showgrid=True,
                gridcolor=self.colors['grid'],
                title_font=dict(size=14),
                tickfont=dict(size=12)
            ),
            legend=dict(
                x=0.01,
                y=0.99,
                bgcolor='rgba(255, 255, 255, 0.9)',
                bordercolor='#ddd',
                borderwidth=1
            ),
            margin=dict(l=60, r=40, t=80, b=60)
        )

        return pio.to_html(fig, full_html=False, include_plotlyjs=False)

    def plot_comparison(self, history: pd.Series, predictions: pd.DataFrame) -> str:
        recent_history = history.tail(30)

        fig = make_subplots(
            rows=2, cols=1,
            subplot_titles=('近30天历史销售', '未来7天预测'),
            vertical_spacing=0.15
        )

        fig.add_trace(go.Bar(
            x=recent_history.index,
            y=recent_history.values,
            name='历史销售额',
            marker_color=self.colors['historical'],
            hovertemplate='日期: %{x}<br>销售额: %{y:,.2f}<extra></extra>'
        ), row=1, col=1)

        fig.add_trace(go.Bar(
            x=predictions.index,
            y=predictions['predicted'],
            name='预测销售额',
            marker_color=self.colors['predicted'],
            error_y=dict(
                type='data',
                symmetric=False,
                array=predictions['upper'] - predictions['predicted'],
                arrayminus=predictions['predicted'] - predictions['lower'],
                color='rgba(44, 160, 44, 0.6)',
                thickness=2,
                width=6
            ),
            hovertemplate='日期: %{x}<br>预测: %{y:,.2f}<br>区间: [%{customdata[0]:,.2f}, %{customdata[1]:,.2f}]<extra></extra>',
            customdata=list(zip(predictions['lower'], predictions['upper']))
        ), row=2, col=1)

        fig.update_xaxes(title_text='日期', row=1, col=1)
        fig.update_xaxes(title_text='日期', row=2, col=1)
        fig.update_yaxes(title_text='销售额', row=1, col=1)
        fig.update_yaxes(title_text='销售额', row=2, col=1)

        fig.update_layout(
            title={
                'text': '历史与预测对比',
                'y': 0.98,
                'x': 0.5,
                'xanchor': 'center',
                'yanchor': 'top',
                'font': dict(size=20, color='#333')
            },
            showlegend=False,
            plot_bgcolor=self.colors['background'],
            paper_bgcolor='white',
            margin=dict(l=60, r=40, t=100, b=60)
        )

        return pio.to_html(fig, full_html=False, include_plotlyjs=False)

    def generate_prediction_table(self, predictions: pd.DataFrame) -> str:
        table_html = """
        <div class="table-responsive">
            <table class="table table-striped table-hover">
                <thead class="thead-dark">
                    <tr>
                        <th>日期</th>
                        <th>星期</th>
                        <th>预测销售额</th>
                        <th>预测下限</th>
                        <th>预测上限</th>
                        <th>预测区间</th>
                    </tr>
                </thead>
                <tbody>
        """

        weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

        for idx, row in predictions.iterrows():
            weekday = weekdays[idx.dayofweek]
            date_str = idx.strftime('%Y-%m-%d')
            predicted = f"{row['predicted']:,.2f}"
            lower = f"{row['lower']:,.2f}"
            upper = f"{row['upper']:,.2f}"
            interval_range = f"{row['upper'] - row['lower']:,.2f}"

            table_html += f"""
                    <tr>
                        <td>{date_str}</td>
                        <td>{weekday}</td>
                        <td><strong>¥{predicted}</strong></td>
                        <td>¥{lower}</td>
                        <td>¥{upper}</td>
                        <td>±¥{interval_range}</td>
                    </tr>
            """

        table_html += """
                </tbody>
            </table>
        </div>
        """
        return table_html

    def generate_summary_cards(self, summary: Dict[str, Any]) -> str:
        cards_html = f"""
        <div class="row">
            <div class="col-md-3">
                <div class="card text-white bg-primary mb-3">
                    <div class="card-header">预测模型</div>
                    <div class="card-body">
                        <h5 class="card-title">{summary.get('model_type', 'N/A')}</h5>
                        <p class="card-text">自动选择最优模型</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-success mb-3">
                    <div class="card-header">预测总销售额</div>
                    <div class="card-body">
                        <h5 class="card-title">¥{summary.get('total_predicted', 0):,.2f}</h5>
                        <p class="card-text">区间: ¥{summary.get('total_lower', 0):,.2f} ~ ¥{summary.get('total_upper', 0):,.2f}</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-info mb-3">
                    <div class="card-header">日均销售额</div>
                    <div class="card-body">
                        <h5 class="card-title">¥{summary.get('average_predicted', 0):,.2f}</h5>
                        <p class="card-text">未来{summary.get('periods', 7)}天平均</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card text-white bg-warning mb-3">
                    <div class="card-header">预测周期</div>
                    <div class="card-body">
                        <h5 class="card-title">{summary.get('periods', 7)}天</h5>
                        <p class="card-text">{summary.get('start_date', '')} ~ {summary.get('end_date', '')}</p>
                    </div>
                </div>
            </div>
        </div>
        """
        return cards_html
