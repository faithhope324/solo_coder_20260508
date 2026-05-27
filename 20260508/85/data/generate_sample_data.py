import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def generate_sample_data():
    np.random.seed(42)
    random.seed(42)
    
    num_records = 1500
    
    review_ids = [f"R{i:06d}" for i in range(1, num_records + 1)]
    
    start_date = datetime(2024, 1, 1)
    end_date = datetime(2024, 12, 31)
    date_range = end_date - start_date
    review_dates = [
        (start_date + timedelta(days=random.randint(0, date_range.days))).strftime("%Y-%m-%d")
        for _ in range(num_records)
    ]
    
    base_rating = np.random.normal(4.0, 0.8, num_records)
    base_rating = np.clip(base_rating, 1.0, 5.0)
    
    wait_time = np.random.normal(15, 8, num_records)
    wait_time = np.clip(wait_time, 3, 45).astype(int)
    
    taste_correlation = 0.7
    taste_noise = np.random.normal(0, 0.5, num_records)
    taste = 2.5 + taste_correlation * (base_rating - 3) + taste_noise
    taste = np.clip(taste, 1.0, 5.0)
    
    service_correlation = 0.6
    service_noise = np.random.normal(0, 0.6, num_records)
    service = 2.8 + service_correlation * (base_rating - 3) + service_noise
    service = np.clip(service, 1.0, 5.0)
    
    wait_correlation = -0.4
    wait_effect = wait_correlation * (wait_time - 15) / 10
    rating = base_rating + wait_effect + np.random.normal(0, 0.3, num_records)
    rating = np.clip(rating, 1.0, 5.0)
    
    comments = generate_comments(rating, wait_time, taste, service)
    
    df = pd.DataFrame({
        'review_id': review_ids,
        'review_date': review_dates,
        'rating': np.round(rating, 1),
        'wait_time': wait_time,
        'taste': np.round(taste, 1),
        'service': np.round(service, 1),
        'comment': comments
    })
    
    df = df.sort_values('review_date').reset_index(drop=True)
    
    output_path = r'd:\project\20260508\85\data\customer_reviews.csv'
    df.to_csv(output_path, index=False, encoding='utf-8-sig')
    print(f"示例数据已生成，共 {len(df)} 条记录，保存到: {output_path}")
    print("\n数据概览:")
    print(df.head())
    print("\n统计信息:")
    print(df[['rating', 'wait_time', 'taste', 'service']].describe())

def generate_comments(ratings, wait_times, tastes, services):
    comments = []
    
    positive_templates = [
        "味道非常棒，服务态度也很好，下次还会再来！",
        "菜品口味极佳，服务员很热情，整体体验很棒。",
        "今天用餐很愉快，菜品美味，服务周到。",
        "强烈推荐这家餐厅，味道好，服务一流！",
        "环境不错，菜品精致，服务员很有耐心。",
        "朋友推荐来的，果然没失望，味道和服务都满分！",
        "特别喜欢他们家的菜，每次来都很满意。",
        "口味正宗，服务热情，是我喜欢的餐厅。",
        "今天点的菜都很好吃，服务员也很贴心。",
        "美食与服务兼具，值得推荐给大家！",
        "菜品色香味俱全，服务员态度超好。",
        "很满意的一次用餐体验，味道赞，服务棒。",
        "他们家的菜真的很合我口味，服务也到位。",
        "慕名而来，果然名不虚传，味道和服务都很好。",
        "服务员很专业，菜品也很美味，点赞！"
    ]
    
    neutral_templates = [
        "味道还可以，服务一般，整体中规中矩吧。",
        "菜品口味还行，服务态度马马虎虎。",
        "普通的一餐，没有特别惊喜的地方。",
        "味道过得去，服务也还行，价格稍贵。",
        "菜品和服务都属于一般水平，不难吃也不惊艳。",
        "整体感觉一般，可能不会特意再来。",
        "味道中规中矩，服务态度一般般。",
        "普通的餐厅，没有太多特色。",
        "菜品和服务都还过得去，性价比一般。",
        "勉强及格吧，各方面都很普通。"
    ]
    
    negative_templates_wait = [
        "味道还行，但是等了太久了，上菜太慢了！",
        "等了快半小时才上菜，再好的味道也没心情了。",
        "菜品口味还可以，但是等待时间太长，体验很差。",
        "上菜速度太慢了，等得人都饿晕了，味道一般。",
        "等餐时间超长，服务也跟不上，不会再来了。"
    ]
    
    negative_templates_taste = [
        "味道不太合我的口味，有点失望。",
        "菜品口味一般，没有想象中好吃。",
        "味道有点奇怪，可能不会再来了。",
        "菜品偏咸/淡，不太符合我的口味。",
        "味道比较普通，对不起这个价格。"
    ]
    
    negative_templates_service = [
        "服务态度太差了，服务员爱理不理的。",
        "味道还可以，但服务实在不敢恭维。",
        "服务员很不专业，体验很差。",
        "服务态度恶劣，叫半天都没人理。",
        "服务跟不上，上菜慢，服务员也没礼貌。"
    ]
    
    negative_templates_general = [
        "整体体验很差，味道和服务都不行。",
        "非常失望的一次用餐，不会再来了。",
        "各方面都需要改进，目前水平太差。",
        "性价比很低，不值得来。",
        "踩雷了，这家店的味道和服务都不行。"
    ]
    
    for i in range(len(ratings)):
        rating = ratings[i]
        wait = wait_times[i]
        taste = tastes[i]
        service = services[i]
        
        if rating >= 4.0:
            comments.append(random.choice(positive_templates))
        elif rating >= 2.5:
            comments.append(random.choice(neutral_templates))
        else:
            if wait > 25 and taste >= 3.5 and service >= 3.5:
                comments.append(random.choice(negative_templates_wait))
            elif taste < 3.0 and service >= 3.0:
                comments.append(random.choice(negative_templates_taste))
            elif service < 3.0 and taste >= 3.0:
                comments.append(random.choice(negative_templates_service))
            else:
                comments.append(random.choice(negative_templates_general))
    
    return comments

if __name__ == "__main__":
    generate_sample_data()
