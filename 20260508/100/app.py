import os
from flask import Flask, render_template, request, jsonify
from data_aggregation import (
    load_riders_data,
    calculate_all_scores,
    get_rider_leaderboard,
    get_rider_radar_data,
    get_all_rider_ids
)
from radar_chart import plot_radar_chart

app = Flask(__name__)

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'riders_log.csv')


@app.route('/')
def index():
    riders_data = load_riders_data(CSV_PATH)
    all_scores = calculate_all_scores(riders_data)
    leaderboard = get_rider_leaderboard(all_scores, sort_by='comprehensive')
    rider_ids = get_all_rider_ids(riders_data)

    selected_rider = request.args.get('rider_id', rider_ids[0] if rider_ids else None)
    radar_img = None
    if selected_rider:
        radar_data = get_rider_radar_data(all_scores, selected_rider)
        if radar_data:
            radar_img = plot_radar_chart(radar_data)

    return render_template('index.html',
                           leaderboard=leaderboard,
                           rider_ids=rider_ids,
                           selected_rider=selected_rider,
                           radar_img=radar_img,
                           enumerate=enumerate)


@app.route('/api/leaderboard')
def api_leaderboard():
    sort_by = request.args.get('sort_by', 'comprehensive')
    riders_data = load_riders_data(CSV_PATH)
    all_scores = calculate_all_scores(riders_data)
    leaderboard = get_rider_leaderboard(all_scores, sort_by=sort_by)
    return jsonify(leaderboard)


@app.route('/api/radar/<rider_id>')
def api_radar(rider_id):
    riders_data = load_riders_data(CSV_PATH)
    all_scores = calculate_all_scores(riders_data)
    radar_data = get_rider_radar_data(all_scores, rider_id)
    if not radar_data:
        return jsonify({'error': 'Rider not found'}), 404
    radar_img = plot_radar_chart(radar_data)
    return jsonify({
        'rider_id': rider_id,
        'radar_data': radar_data,
        'radar_image': radar_img
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
