from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from recommendation_model import NewsRecommendationSystem
import os

app = Flask(__name__)
CORS(app)

recommender = NewsRecommendationSystem()


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/styles.css')
def styles():
    return send_from_directory('.', 'styles.css', mimetype='text/css')


@app.route('/app.js')
def app_js():
    return send_from_directory('.', 'app.js', mimetype='application/javascript')


@app.route('/api/recommendations', methods=['GET'])
def get_recommendations():
    user_id = request.args.get('user_id', 'default_user')
    top_n = int(request.args.get('top_n', 10))

    recommendations = recommender.get_recommendations(user_id, top_n)
    user_profile = recommender.get_user_profile(user_id)

    return jsonify({
        'success': True,
        'user_id': user_id,
        'recommendations': recommendations,
        'user_profile': user_profile
    })


@app.route('/api/behavior', methods=['POST'])
def log_behavior():
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')
    news_id = data.get('news_id')
    action = data.get('action')
    duration = data.get('duration', 0)

    if not news_id or not action:
        return jsonify({'success': False, 'message': '缺少必要参数'}), 400

    if action not in ['click', 'dislike', 'view']:
        return jsonify({'success': False, 'message': '无效的行为类型'}), 400

    result = recommender.log_behavior(user_id, news_id, action, duration)

    if action == 'dislike':
        new_recommendations = recommender.get_recommendations(user_id, 10)
        return jsonify({
            'success': result,
            'message': '反馈已记录，推荐列表已更新',
            'new_recommendations': new_recommendations
        })

    return jsonify({
        'success': result,
        'message': '行为已记录'
    })


@app.route('/api/user/profile', methods=['GET'])
def get_user_profile():
    user_id = request.args.get('user_id', 'default_user')
    profile = recommender.get_user_profile(user_id)
    stats = recommender.get_behavior_stats(user_id)

    return jsonify({
        'success': True,
        'profile': profile,
        'stats': stats
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    stats = recommender.get_behavior_stats()
    return jsonify({
        'success': True,
        'stats': stats
    })


@app.route('/api/news/<int:news_id>', methods=['GET'])
def get_news_detail(news_id):
    news = recommender.news_data[recommender.news_data['id'] == news_id]
    if len(news) == 0:
        return jsonify({'success': False, 'message': '新闻不存在'}), 404

    news_dict = news.iloc[0].to_dict()
    return jsonify({
        'success': True,
        'news': news_dict
    })


@app.route('/api/user/clear', methods=['POST'])
def clear_user_history():
    data = request.get_json()
    user_id = data.get('user_id', 'default_user')

    recommender.behavior_log = [
        entry for entry in recommender.behavior_log
        if entry['user_id'] != user_id
    ]
    recommender.user_clicks.pop(user_id, None)
    recommender.user_dislikes.pop(user_id, None)
    recommender._save_behavior_data()

    new_recommendations = recommender.get_recommendations(user_id, 10)
    new_profile = recommender.get_user_profile(user_id)
    new_stats = recommender.get_behavior_stats(user_id)

    return jsonify({
        'success': True,
        'message': '用户记录已清除',
        'recommendations': new_recommendations,
        'profile': new_profile,
        'stats': new_stats
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
