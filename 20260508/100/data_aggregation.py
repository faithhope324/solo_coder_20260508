import csv
from performance_scoring import calculate_rider_scores


def load_riders_data(csv_path):
    riders = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            riders.append({
                'rider_id': row['rider_id'],
                'order_count': int(row['order_count']),
                'avg_delivery_time': float(row['avg_delivery_time']),
                'complaint_rate': float(row['complaint_rate']),
                'positive_reviews': int(row['positive_reviews'])
            })
    return riders


def get_rider_by_id(riders, rider_id):
    for rider in riders:
        if rider['rider_id'] == rider_id:
            return rider
    return None


def calculate_all_scores(riders):
    all_scores = []
    for rider in riders:
        scores = calculate_rider_scores(rider, riders)
        all_scores.append({
            'rider_id': rider['rider_id'],
            'order_count': rider['order_count'],
            'avg_delivery_time': rider['avg_delivery_time'],
            'complaint_rate': rider['complaint_rate'],
            'positive_reviews': rider['positive_reviews'],
            'speed': scores['speed'],
            'service': scores['service'],
            'punctuality': scores['punctuality'],
            'comprehensive': scores['comprehensive']
        })
    return all_scores


def get_rider_leaderboard(scores, sort_by='comprehensive', descending=True):
    return sorted(scores, key=lambda x: x[sort_by], reverse=descending)


def get_rider_radar_data(scores_list, rider_id):
    for score in scores_list:
        if score['rider_id'] == rider_id:
            return {
                'rider_id': rider_id,
                'speed': score['speed'],
                'service': score['service'],
                'punctuality': score['punctuality']
            }
    return None


def get_all_rider_ids(riders):
    return [r['rider_id'] for r in riders]
