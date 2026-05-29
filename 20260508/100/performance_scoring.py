def normalize(value, min_val, max_val, reverse=False):
    if max_val == min_val:
        return 0.5
    normalized = (value - min_val) / (max_val - min_val)
    return 1 - normalized if reverse else normalized


def calculate_speed_score(avg_delivery_time, all_times):
    min_time = min(all_times)
    max_time = max(all_times)
    return normalize(avg_delivery_time, min_time, max_time, reverse=True) * 100


def calculate_service_score(complaint_rate, all_rates):
    min_rate = min(all_rates)
    max_rate = max(all_rates)
    return normalize(complaint_rate, min_rate, max_rate, reverse=True) * 100


def calculate_punctuality_score(positive_reviews, order_count, all_review_ratios):
    review_ratio = positive_reviews / order_count if order_count > 0 else 0
    min_ratio = min(all_review_ratios)
    max_ratio = max(all_review_ratios)
    return normalize(review_ratio, min_ratio, max_ratio) * 100


def calculate_comprehensive_score(speed_score, service_score, punctuality_score,
                                  weights=None):
    if weights is None:
        weights = {'speed': 0.4, 'service': 0.3, 'punctuality': 0.3}
    return (speed_score * weights['speed'] +
            service_score * weights['service'] +
            punctuality_score * weights['punctuality'])


def calculate_rider_scores(rider_data, all_riders_data):
    all_times = [r['avg_delivery_time'] for r in all_riders_data]
    all_rates = [r['complaint_rate'] for r in all_riders_data]
    all_review_ratios = [r['positive_reviews'] / r['order_count'] if r['order_count'] > 0 else 0
                         for r in all_riders_data]

    speed_score = calculate_speed_score(rider_data['avg_delivery_time'], all_times)
    service_score = calculate_service_score(rider_data['complaint_rate'], all_rates)
    punctuality_score = calculate_punctuality_score(
        rider_data['positive_reviews'], rider_data['order_count'], all_review_ratios
    )
    comprehensive_score = calculate_comprehensive_score(
        speed_score, service_score, punctuality_score
    )

    return {
        'rider_id': rider_data['rider_id'],
        'speed': round(speed_score, 2),
        'service': round(service_score, 2),
        'punctuality': round(punctuality_score, 2),
        'comprehensive': round(comprehensive_score, 2)
    }
