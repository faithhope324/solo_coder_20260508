import os
from flask import Flask, render_template, request, jsonify
from date_utils import load_orders, filter_by_month, get_available_months
from occupancy import calc_daily_occupancy, calc_monthly_avg_occupancy, calc_avg_stay, calc_monthly_avg_stay
from channel import calc_channel_contribution, calc_channel_monthly_trend, calc_season_comparison, calc_room_type_stats
from charts import (
    occupancy_line_chart, channel_trend_line_chart, season_bar_chart,
    channel_pie_chart, room_type_bar_chart, avg_stay_bar_chart
)

app = Flask(__name__)

CSV_PATH = os.path.join(os.path.dirname(__file__), 'data', 'hotel_orders.csv')


@app.route('/')
def index():
    year_month = request.args.get('month', '')
    df = load_orders(CSV_PATH)
    available_months = get_available_months(df)
    filtered_df = filter_by_month(df, year_month)
    daily_occ = calc_daily_occupancy(filtered_df)
    monthly_occ = calc_monthly_avg_occupancy(daily_occ)
    avg_stay = calc_avg_stay(filtered_df)
    monthly_stay = calc_monthly_avg_stay(df)
    channel_stats = calc_channel_contribution(filtered_df)
    channel_trend = calc_channel_monthly_trend(filtered_df) if not year_month else calc_channel_monthly_trend(df)
    season_stats = calc_season_comparison(filtered_df)
    room_stats = calc_room_type_stats(filtered_df)
    charts = {
        'occupancy': occupancy_line_chart(daily_occ, f'每日入住率趋势{" - " + year_month if year_month else ""}'),
        'channel_trend': channel_trend_line_chart(channel_trend),
        'season': season_bar_chart(season_stats),
        'channel_pie': channel_pie_chart(channel_stats),
        'room_type': room_type_bar_chart(room_stats),
        'avg_stay': avg_stay_bar_chart(monthly_stay)
    }
    summary = {
        'total_orders': len(filtered_df),
        'avg_stay': avg_stay,
        'avg_occupancy': round(daily_occ['入住率'].mean(), 2) if not daily_occ.empty else 0,
        'total_revenue': round((filtered_df['价格'] * filtered_df['入住时长']).sum(), 2),
        'selected_month': year_month
    }
    return render_template('index.html',
                           charts=charts,
                           summary=summary,
                           available_months=available_months,
                           selected_month=year_month,
                           channel_stats=channel_stats.to_dict('records') if not channel_stats.empty else [],
                           room_stats=room_stats.to_dict('records') if not room_stats.empty else [])


@app.route('/api/data')
def api_data():
    year_month = request.args.get('month', '')
    df = load_orders(CSV_PATH)
    filtered_df = filter_by_month(df, year_month)
    daily_occ = calc_daily_occupancy(filtered_df)
    avg_stay = calc_avg_stay(filtered_df)
    channel_stats = calc_channel_contribution(filtered_df)
    season_stats = calc_season_comparison(filtered_df)
    return jsonify({
        'summary': {
            'total_orders': len(filtered_df),
            'avg_stay': avg_stay,
            'avg_occupancy': round(daily_occ['入住率'].mean(), 2) if not daily_occ.empty else 0,
            'total_revenue': round(filtered_df['价格'].sum(), 2)
        },
        'channel_stats': channel_stats.to_dict('records') if not channel_stats.empty else [],
        'season_stats': season_stats.to_dict('records') if not season_stats.empty else []
    })


if __name__ == '__main__':
    app.run(debug=True, port=5000)
