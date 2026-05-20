from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import logging
from datetime import datetime

from data_generator import generate_player_data
from churn_model import ChurnPredictionModel, FEATURE_COLS, FEATURE_NAMES_CN, get_recommendations

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

model = ChurnPredictionModel()
players_df = None

def init_system():
    global players_df, model
    
    logger.info("正在初始化系统...")
    
    if not model.load_model():
        logger.info("未找到已训练模型，开始训练新模型...")
        model.train()
    
    players_df = generate_player_data(200)
    
    churn_probs = model.predict_batch(players_df)
    players_df['churn_probability'] = churn_probs
    players_df['risk_level'] = players_df['churn_probability'].apply(model.get_risk_level)
    
    logger.info(f"系统初始化完成，共加载 {len(players_df)} 名玩家数据")
    logger.info(f"风险分布 - 高风险: {(players_df['risk_level'] == 'high').sum()}, "
                f"中风险: {(players_df['risk_level'] == 'medium').sum()}, "
                f"低风险: {(players_df['risk_level'] == 'low').sum()}")

@app.route('/api/players', methods=['GET'])
def get_players():
    risk_filter = request.args.get('risk_level', 'all')
    search = request.args.get('search', '').lower()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    
    df = players_df.copy()
    
    if risk_filter != 'all':
        df = df[df['risk_level'] == risk_filter]
    
    if search:
        df = df[
            df['player_id'].str.lower().str.contains(search) |
            df['name'].str.lower().str.contains(search)
        ]
    
    df = df.sort_values('churn_probability', ascending=False)
    
    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = df.iloc[start:end]
    
    players_list = []
    for _, row in paginated.iterrows():
        players_list.append({
            'player_id': row['player_id'],
            'name': row['name'],
            'churn_probability': round(float(row['churn_probability']), 4),
            'risk_level': row['risk_level'],
            'login_freq_7d': int(row['login_freq_7d']),
            'recharge_amount': float(row['recharge_amount']),
            'level_progress': float(row['level_progress']),
            'days_since_last_login': int(row['days_since_last_login']),
            'registration_date': row['registration_date']
        })
    
    return jsonify({
        'players': players_list,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })

@app.route('/api/players/<player_id>', methods=['GET'])
def get_player_detail(player_id):
    player = players_df[players_df['player_id'] == player_id]
    
    if len(player) == 0:
        return jsonify({'error': '玩家不存在'}), 404
    
    player = player.iloc[0]
    player_data = player.to_dict()
    
    features = {}
    for col in FEATURE_COLS:
        features[col] = {
            'value': float(player_data[col]),
            'name': FEATURE_NAMES_CN[col]
        }
    
    recommendations = get_recommendations(player_data, player_data['risk_level'])
    
    radar_data = []
    for col in FEATURE_COLS:
        value = float(player_data[col])
        max_val = players_df[col].max()
        normalized = (value / max_val * 100) if max_val > 0 else 0
        radar_data.append({
            'feature': FEATURE_NAMES_CN[col],
            'value': value,
            'normalized': round(normalized, 1),
            'max': float(max_val)
        })
    
    return jsonify({
        'player_id': player_data['player_id'],
        'name': player_data['name'],
        'churn_probability': round(float(player_data['churn_probability']), 4),
        'risk_level': player_data['risk_level'],
        'features': features,
        'radar_data': radar_data,
        'recommendations': recommendations,
        'registration_date': player_data['registration_date'],
        'is_churned': bool(player_data['churned'])
    })

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    total = len(players_df)
    high_risk = (players_df['risk_level'] == 'high').sum()
    medium_risk = (players_df['risk_level'] == 'medium').sum()
    low_risk = (players_df['risk_level'] == 'low').sum()
    avg_churn_prob = players_df['churn_probability'].mean()
    
    return jsonify({
        'total_players': total,
        'high_risk_count': int(high_risk),
        'medium_risk_count': int(medium_risk),
        'low_risk_count': int(low_risk),
        'avg_churn_probability': round(float(avg_churn_prob), 4),
        'high_risk_percentage': round(high_risk / total * 100, 1),
        'medium_risk_percentage': round(medium_risk / total * 100, 1),
        'low_risk_percentage': round(low_risk / total * 100, 1)
    })

@app.route('/api/intervene', methods=['POST'])
def intervene():
    data = request.get_json()
    player_ids = data.get('player_ids', [])
    intervention_type = data.get('type', 'push')
    
    if not player_ids:
        return jsonify({'error': '未指定玩家ID列表'}), 400
    
    valid_players = players_df[players_df['player_id'].isin(player_ids)]
    success_count = len(valid_players)
    failed_count = len(player_ids) - success_count
    
    results = []
    for pid in player_ids:
        player = players_df[players_df['player_id'] == pid]
        if len(player) > 0:
            player_data = player.iloc[0]
            recs = get_recommendations(player_data, player_data['risk_level'])
            
            action_taken = None
            for rec in recs:
                if rec['type'] == intervention_type or intervention_type == 'auto':
                    action_taken = rec
                    break
            
            if action_taken is None and recs:
                action_taken = recs[0]
            
            results.append({
                'player_id': pid,
                'name': player_data['name'],
                'success': True,
                'action': action_taken if action_taken else {'type': 'none', 'title': '无匹配干预措施'},
                'timestamp': datetime.now().isoformat()
            })
        else:
            results.append({
                'player_id': pid,
                'success': False,
                'error': '玩家不存在',
                'timestamp': datetime.now().isoformat()
            })
    
    logger.info(f"批量干预执行完成 - 成功: {success_count}, 失败: {failed_count}, 类型: {intervention_type}")
    
    return jsonify({
        'success': True,
        'total': len(player_ids),
        'success_count': success_count,
        'failed_count': failed_count,
        'intervention_type': intervention_type,
        'results': results
    })

@app.route('/api/feature-importance', methods=['GET'])
def get_feature_importance():
    if model.feature_importance is None:
        return jsonify({'error': '模型未训练'}), 400
    
    importance_list = []
    for feat, imp in sorted(model.feature_importance.items(), key=lambda x: -x[1]):
        importance_list.append({
            'feature': feat,
            'name': FEATURE_NAMES_CN[feat],
            'importance': round(float(imp), 4)
        })
    
    return jsonify({'features': importance_list})

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'model_loaded': model.model is not None,
        'players_count': len(players_df) if players_df is not None else 0
    })

if __name__ == '__main__':
    init_system()
    app.run(host='0.0.0.0', port=5000, debug=True)
