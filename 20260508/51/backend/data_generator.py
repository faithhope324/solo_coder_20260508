import numpy as np
import pandas as pd
import random
from datetime import datetime, timedelta

def generate_player_data(num_players=200):
    np.random.seed(42)
    random.seed(42)
    
    player_ids = [f'P{str(i).zfill(5)}' for i in range(1, num_players + 1)]
    names = generate_names(num_players)
    
    login_freq = np.random.exponential(scale=15, size=num_players).astype(int)
    login_freq = np.clip(login_freq, 0, 60)
    
    total_playtime = login_freq * np.random.uniform(0.5, 4, num_players)
    total_playtime = np.round(total_playtime, 1)
    
    recharge_amount = np.random.exponential(scale=100, size=num_players)
    recharge_amount = np.where(
        np.random.random(num_players) < 0.3,
        0,
        recharge_amount
    )
    recharge_amount = np.round(recharge_amount, 2)
    
    level_progress = np.random.beta(2, 2, num_players) * 100
    level_progress = np.round(level_progress, 1)
    
    recent_activity = np.random.randint(0, 30, num_players)
    
    social_connections = np.random.poisson(5, num_players)
    social_connections = np.clip(social_connections, 0, 30)
    
    purchase_count = np.random.poisson(2, num_players)
    purchase_count = np.where(recharge_amount == 0, 0, purchase_count)
    
    days_since_last_login = np.random.exponential(scale=7, size=num_players).astype(int)
    days_since_last_login = np.clip(days_since_last_login, 0, 60)
    
    task_completion = np.random.beta(2, 1.5, num_players) * 100
    task_completion = np.round(task_completion, 1)
    
    churn_labels = generate_churn_labels(
        login_freq, total_playtime, recharge_amount,
        level_progress, days_since_last_login,
        task_completion, social_connections
    )
    
    registration_dates = [
        (datetime.now() - timedelta(days=random.randint(7, 365))).strftime('%Y-%m-%d')
        for _ in range(num_players)
    ]
    
    data = pd.DataFrame({
        'player_id': player_ids,
        'name': names,
        'login_freq_7d': login_freq,
        'total_playtime_hours': total_playtime,
        'recharge_amount': recharge_amount,
        'level_progress': level_progress,
        'recent_activity_days': recent_activity,
        'social_connections': social_connections,
        'purchase_count': purchase_count,
        'days_since_last_login': days_since_last_login,
        'task_completion_rate': task_completion,
        'registration_date': registration_dates,
        'churned': churn_labels
    })
    
    return data

def generate_names(n):
    first_names = ['张', '李', '王', '刘', '陈', '杨', '黄', '赵', '周', '吴', '徐', '孙', '马', '胡', '朱']
    last_names = ['伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛']
    
    names = []
    used = set()
    while len(names) < n:
        name = random.choice(first_names) + random.choice(last_names)
        if name not in used:
            used.add(name)
            names.append(name)
    return names

def generate_churn_labels(login_freq, playtime, recharge, level, days_since_login, task_rate, social):
    n = len(login_freq)
    churn_prob = np.zeros(n)
    
    churn_prob += np.where(login_freq < 5, 0.25, 0)
    churn_prob += np.where(login_freq < 2, 0.2, 0)
    
    churn_prob += np.where(days_since_login > 14, 0.25, 0)
    churn_prob += np.where(days_since_login > 7, 0.15, 0)
    
    churn_prob += np.where(level < 30, 0.15, 0)
    churn_prob += np.where(level < 10, 0.15, 0)
    
    churn_prob += np.where(recharge == 0, 0.1, 0)
    churn_prob += np.where(recharge < 10, 0.05, 0)
    
    churn_prob += np.where(task_rate < 40, 0.1, 0)
    churn_prob += np.where(social < 2, 0.1, 0)
    
    churn_prob += np.random.normal(0, 0.05, n)
    churn_prob = np.clip(churn_prob, 0, 1)
    
    return (churn_prob > 0.5).astype(int)

if __name__ == '__main__':
    df = generate_player_data(200)
    print(df.head())
    print(f"\n流失率: {df['churned'].mean():.2%}")
    df.to_csv('players_data.csv', index=False, encoding='utf-8-sig')
    print("\n数据已保存到 players_data.csv")
