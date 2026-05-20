import numpy as np
import pandas as pd
from collections import defaultdict
import json
import os
from datetime import datetime


class NewsRecommendationSystem:
    def __init__(self):
        self.news_data = self._generate_news_data()
        self.user_behavior = defaultdict(list)
        self.user_dislikes = defaultdict(set)
        self.user_clicks = defaultdict(set)
        self.behavior_log = []
        self._load_behavior_data()

    def _generate_news_data(self):
        categories = ['科技', '财经', '体育', '娱乐', '健康', '教育', '国际', '军事']
        news_list = []
        
        news_templates = {
            '科技': [
                '人工智能最新突破：大模型性能提升50%',
                '量子计算机实现重大技术进展',
                '新能源汽车销量创历史新高',
                '5G网络覆盖率达到新里程碑',
                '芯片行业迎来新一轮技术革新',
                '元宇宙应用场景持续扩展',
                '区块链技术在金融领域应用加速',
                '智能家居市场规模突破万亿'
            ],
            '财经': [
                'A股市场迎来新一轮上涨行情',
                '央行宣布最新货币政策调整',
                '房地产市场出现回暖迹象',
                '人民币汇率保持稳定态势',
                '新能源板块持续走强',
                '上市公司年报业绩普遍超预期',
                '外资持续加仓中国资产',
                '黄金价格创历史新高'
            ],
            '体育': [
                '世界杯预选赛中国队大胜对手',
                'NBA季后赛进入关键阶段',
                '奥运会筹备工作有序推进',
                '足球联赛冠军悬念揭晓',
                '网球大满贯赛事即将开打',
                '马拉松赛事吸引数万跑者',
                '电竞入奥取得重大进展',
                '冰雪运动普及度持续提升'
            ],
            '娱乐': [
                '热门电影票房突破十亿',
                '新一季综艺节目收视率夺冠',
                '知名歌手发布新专辑',
                '电视剧收视率创新高',
                '电影节颁奖典礼圆满落幕',
                '演唱会门票秒售罄',
                '脱口秀节目广受好评',
                '动漫IP持续火爆'
            ],
            '健康': [
                '新型疫苗研发取得重要进展',
                '健康饮食新趋势引发关注',
                '运动健身成为生活方式',
                '心理健康意识显著提升',
                '中医药现代化加速推进',
                '睡眠健康问题受重视',
                '远程医疗服务普及推广',
                '基因检测技术助力精准医疗'
            ],
            '教育': [
                '高考改革新方案公布',
                '在线教育市场持续增长',
                '职业教育迎来发展机遇',
                '校园智能化建设加速',
                '双减政策效果显现',
                '研究生招生规模扩大',
                '国际教育交流逐步恢复',
                '素质教育全面推进'
            ],
            '国际': [
                '多国领导人举行重要会晤',
                '全球经济复苏态势明显',
                '国际贸易协定签署',
                '国际科技合作取得突破',
                '气候变化大会达成共识',
                '全球供应链逐步重构',
                '文化交流活动频繁举办',
                '国际旅游市场回暖'
            ],
            '军事': [
                '国防科技取得新突破',
                '军事演习顺利完成',
                '退役军人保障政策完善',
                '国防教育深入开展',
                '军事现代化建设加速',
                '维和任务有序推进',
                '军民融合深度发展',
                '海防建设持续加强'
            ]
        }

        news_id = 1
        for category, templates in news_templates.items():
            for title in templates:
                news_list.append({
                    'id': news_id,
                    'title': title,
                    'category': category,
                    'content': f'这是一篇关于{category}的新闻报道，详细介绍了{title}的相关内容...',
                    'publish_time': datetime.now().strftime('%Y-%m-%d'),
                    'popularity': np.random.randint(100, 10000)
                })
                news_id += 1

        return pd.DataFrame(news_list)

    def _load_behavior_data(self):
        if os.path.exists('user_behavior.json'):
            with open('user_behavior.json', 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.behavior_log = data.get('behavior_log', [])
                for entry in self.behavior_log:
                    user_id = entry['user_id']
                    if entry['action'] == 'click':
                        self.user_clicks[user_id].add(entry['news_id'])
                    elif entry['action'] == 'dislike':
                        self.user_dislikes[user_id].add(entry['news_id'])

    def _save_behavior_data(self):
        data = {
            'behavior_log': self.behavior_log
        }
        with open('user_behavior.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def log_behavior(self, user_id, news_id, action, duration=0):
        entry = {
            'user_id': user_id,
            'news_id': news_id,
            'action': action,
            'timestamp': datetime.now().isoformat(),
            'duration': duration
        }
        self.behavior_log.append(entry)

        if action == 'click':
            self.user_clicks[user_id].add(news_id)
        elif action == 'dislike':
            self.user_dislikes[user_id].add(news_id)
            if news_id in self.user_clicks[user_id]:
                self.user_clicks[user_id].remove(news_id)

        self._save_behavior_data()
        return True

    def _calculate_category_similarity(self, cat1, cat2):
        category_relations = {
            ('科技', '财经'): 0.4,
            ('科技', '军事'): 0.5,
            ('科技', '教育'): 0.3,
            ('财经', '国际'): 0.4,
            ('财经', '健康'): 0.2,
            ('体育', '娱乐'): 0.3,
            ('娱乐', '健康'): 0.2,
            ('教育', '健康'): 0.3,
            ('国际', '军事'): 0.4,
        }
        if cat1 == cat2:
            return 1.0
        key = tuple(sorted([cat1, cat2]))
        return category_relations.get(key, 0.1)

    def _calculate_feature_contributions(self, user_id, candidate_news):
        contributions = []

        user_click_ids = self.user_clicks.get(user_id, set())
        user_dislike_ids = self.user_dislikes.get(user_id, set())

        if not user_click_ids:
            for _, news in candidate_news.iterrows():
                contributions.append({
                    'news_id': news['id'],
                    'features': {
                        '热门推荐': 0.6,
                        '新鲜度': 0.4
                    },
                    'total_score': 0.5 + np.random.random() * 0.3
                })
            return contributions

        clicked_news = self.news_data[self.news_data['id'].isin(user_click_ids)]
        user_categories = clicked_news['category'].value_counts().to_dict()
        total_clicks = sum(user_categories.values())

        for _, news in candidate_news.iterrows():
            feature_contrib = {}
            category_score = 0

            for clicked_cat, count in user_categories.items():
                sim = self._calculate_category_similarity(clicked_cat, news['category'])
                weight = count / total_clicks
                category_score += sim * weight
                if sim > 0.5 and clicked_cat != news['category']:
                    feature_contrib[f'与你感兴趣的{clicked_cat}相关'] = sim * weight * 0.8

            if news['category'] in user_categories:
                category_weight = user_categories[news['category']] / total_clicks
                feature_contrib[f'你感兴趣的{news["category"]}类别'] = category_weight

            popularity_score = min(news['popularity'] / 10000, 1.0) * 0.3
            if popularity_score > 0.1:
                feature_contrib['热门新闻'] = popularity_score

            recency_score = 0.2
            feature_contrib['新鲜度'] = recency_score

            total_score = sum(feature_contrib.values())
            normalized_contrib = {k: v / total_score for k, v in feature_contrib.items()}
            final_score = total_score / 2

            contributions.append({
                'news_id': news['id'],
                'features': normalized_contrib,
                'total_score': final_score
            })

        return contributions

    def get_recommendations(self, user_id, top_n=10):
        user_dislike_ids = self.user_dislikes.get(user_id, set())
        user_click_ids = self.user_clicks.get(user_id, set())

        candidate_mask = ~self.news_data['id'].isin(user_dislike_ids)
        if user_click_ids:
            candidate_mask = candidate_mask & ~self.news_data['id'].isin(user_click_ids)

        candidates = self.news_data[candidate_mask].copy()

        if len(candidates) == 0:
            candidates = self.news_data[~self.news_data['id'].isin(user_dislike_ids)].copy()

        contributions = self._calculate_feature_contributions(user_id, candidates)
        contrib_df = pd.DataFrame(contributions)

        result = candidates.merge(contrib_df, left_on='id', right_on='news_id')
        result = result.sort_values('total_score', ascending=False).head(top_n)

        recommendations = []
        for _, row in result.iterrows():
            reasons = self._generate_reasons(row['features'], row['category'])
            recommendations.append({
                'id': row['id'],
                'title': row['title'],
                'category': row['category'],
                'content': row['content'],
                'publish_time': row['publish_time'],
                'popularity': row['popularity'],
                'score': round(row['total_score'], 4),
                'reasons': reasons,
                'feature_contributions': row['features']
            })

        return recommendations

    def _generate_reasons(self, features, category):
        reasons = []
        sorted_features = sorted(features.items(), key=lambda x: x[1], reverse=True)

        for feature, weight in sorted_features[:3]:
            if weight > 0.1:
                if '类别' in feature:
                    reasons.append(f'因为你之前点击了{category}类新闻')
                elif '相关' in feature:
                    reasons.append(f'与你感兴趣的内容相关')
                elif '热门' in feature:
                    reasons.append('这是近期热门新闻')
                elif '新鲜' in feature:
                    reasons.append('刚刚发布的新鲜资讯')

        if not reasons:
            reasons.append('为你精选的推荐')

        return reasons

    def get_behavior_stats(self, user_id=None):
        if user_id:
            user_clicks = self.user_clicks.get(user_id, set())
            user_dislikes = self.user_dislikes.get(user_id, set())
            return {
                'user_id': user_id,
                'click_count': len(user_clicks),
                'dislike_count': len(user_dislikes),
                'clicked_news': list(user_clicks),
                'disliked_news': list(user_dislikes)
            }
        else:
            return {
                'total_users': len(self.user_clicks) + len(self.user_dislikes),
                'total_behaviors': len(self.behavior_log),
                'total_clicks': sum(len(v) for v in self.user_clicks.values()),
                'total_dislikes': sum(len(v) for v in self.user_dislikes.values())
            }

    def get_user_profile(self, user_id):
        user_click_ids = self.user_clicks.get(user_id, set())
        if not user_click_ids:
            return {
                'user_id': user_id,
                'preferences': {},
                'click_history': []
            }

        clicked_news = self.news_data[self.news_data['id'].isin(user_click_ids)]
        category_prefs = clicked_news['category'].value_counts(normalize=True).to_dict()

        click_history = []
        for _, row in clicked_news.iterrows():
            click_history.append({
                'id': row['id'],
                'title': row['title'],
                'category': row['category'],
                'time': next(
                    (e['timestamp'] for e in self.behavior_log
                     if e['user_id'] == user_id and e['news_id'] == row['id'] and e['action'] == 'click'),
                    None
                )
            })

        return {
            'user_id': user_id,
            'preferences': {k: round(v, 4) for k, v in category_prefs.items()},
            'click_history': sorted(click_history, key=lambda x: x['time'] or '', reverse=True)
        }
