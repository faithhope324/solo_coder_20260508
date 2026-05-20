import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os

from data_generator import generate_player_data

FEATURE_COLS = [
    'login_freq_7d',
    'total_playtime_hours',
    'recharge_amount',
    'level_progress',
    'recent_activity_days',
    'social_connections',
    'purchase_count',
    'days_since_last_login',
    'task_completion_rate'
]

FEATURE_NAMES_CN = {
    'login_freq_7d': '7日登录次数',
    'total_playtime_hours': '总游戏时长(小时)',
    'recharge_amount': '累计充值金额',
    'level_progress': '关卡进度(%)',
    'recent_activity_days': '活跃天数',
    'social_connections': '社交关系数',
    'purchase_count': '购买次数',
    'days_since_last_login': '距上次登录天数',
    'task_completion_rate': '任务完成率(%)'
}

class ChurnPredictionModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.feature_importance = None
        self.model_path = 'churn_model.pkl'
        self.scaler_path = 'scaler.pkl'
        
    def train(self, df=None):
        if df is None:
            df = generate_player_data(500)
        
        X = df[FEATURE_COLS].values
        y = df['churned'].values
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        self.scaler.fit(X_train)
        X_train_scaled = self.scaler.transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            class_weight='balanced',
            random_state=42
        )
        
        self.model.fit(X_train_scaled, y_train)
        
        self.feature_importance = dict(zip(FEATURE_COLS, self.model.feature_importances_))
        
        y_pred = self.model.predict(X_test_scaled)
        y_proba = self.model.predict_proba(X_test_scaled)[:, 1]
        
        print("模型训练完成！")
        print("\n测试集性能:")
        print(classification_report(y_test, y_pred))
        print(f"ROC AUC: {roc_auc_score(y_test, y_proba):.4f}")
        
        print("\n特征重要性:")
        for feat, imp in sorted(self.feature_importance.items(), key=lambda x: -x[1]):
            print(f"  {FEATURE_NAMES_CN[feat]}: {imp:.4f}")
        
        self.save_model()
        return self
    
    def save_model(self):
        joblib.dump(self.model, self.model_path)
        joblib.dump(self.scaler, self.scaler_path)
        print(f"\n模型已保存到 {self.model_path}")
    
    def load_model(self):
        if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
            self.model = joblib.load(self.model_path)
            self.scaler = joblib.load(self.scaler_path)
            print("模型加载成功")
            return True
        return False
    
    def predict_proba(self, player_features):
        if isinstance(player_features, dict):
            features = np.array([[player_features[col] for col in FEATURE_COLS]])
        elif isinstance(player_features, pd.DataFrame):
            features = player_features[FEATURE_COLS].values
        elif isinstance(player_features, pd.Series):
            features = np.array([[player_features[col] for col in FEATURE_COLS]])
        else:
            features = np.array(player_features)
        
        if features.ndim == 1:
            features = features.reshape(1, -1)
        
        features_scaled = self.scaler.transform(features)
        proba = self.model.predict_proba(features_scaled)[:, 1]
        return proba[0] if len(proba) == 1 else proba
    
    def predict_batch(self, df):
        X = df[FEATURE_COLS].values
        X_scaled = self.scaler.transform(X)
        proba = self.model.predict_proba(X_scaled)[:, 1]
        return proba
    
    def get_risk_level(self, prob):
        if prob >= 0.7:
            return 'high'
        elif prob >= 0.4:
            return 'medium'
        else:
            return 'low'

def get_recommendations(player_data, risk_level):
    recommendations = []
    
    if player_data['days_since_last_login'] > 7:
        recommendations.append({
            'type': 'push',
            'title': '召回推送',
            'content': '亲爱的玩家，我们想你了！登录即可领取回归礼包。',
            'priority': 'high'
        })
    
    if player_data['recharge_amount'] > 0 and risk_level in ['high', 'medium']:
        recommendations.append({
            'type': 'coupon',
            'title': '专属优惠券',
            'content': '为您送上专属8折充值优惠券，限时有效！',
            'priority': 'high'
        })
    
    if player_data['level_progress'] < 50 and player_data['task_completion_rate'] < 60:
        recommendations.append({
            'type': 'guide',
            'title': '新手引导',
            'content': '推荐参与新手训练营活动，快速提升等级。',
            'priority': 'medium'
        })
    
    if player_data['social_connections'] < 3:
        recommendations.append({
            'type': 'social',
            'title': '社交活动',
            'content': '邀请好友一起游戏，双方均可获得丰厚奖励！',
            'priority': 'medium'
        })
    
    if risk_level == 'high':
        recommendations.append({
            'type': 'event',
            'title': '活动邀请',
            'content': '诚邀您参与本周限定活动，参与即得稀有道具。',
            'priority': 'high'
        })
    
    if player_data['login_freq_7d'] < 3 and player_data['recharge_amount'] > 100:
        recommendations.append({
            'type': 'vip',
            'title': 'VIP专属',
            'content': '尊敬的VIP用户，专属客服已准备好为您服务。',
            'priority': 'high'
        })
    
    recommendations.sort(key=lambda x: 0 if x['priority'] == 'high' else 1)
    return recommendations

if __name__ == '__main__':
    model = ChurnPredictionModel()
    model.train()
