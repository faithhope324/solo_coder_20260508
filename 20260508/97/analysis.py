import pandas as pd
from collections import Counter


def reason_frequency(df):
    counts = df['return_reason'].value_counts()
    return counts.to_dict()


def category_return_rate(df):
    cat_counts = df.groupby('product_category')['quantity'].sum()
    total = cat_counts.sum()
    rates = (cat_counts / total * 100).round(2)
    result = pd.DataFrame({
        'category': rates.index,
        'quantity': cat_counts.values,
        'rate': rates.values
    }).sort_values('rate', ascending=False)
    return result.to_dict('records')


def price_range_distribution(df):
    price_counts = df.groupby('price_range')['quantity'].sum()
    total = price_counts.sum()
    percentages = (price_counts / total * 100).round(2)

    order = ['0-100', '100-200', '200-500', '500-1000', '1000以上']
    existing = [p for p in order if p in price_counts.index]

    result = []
    for p in existing:
        result.append({
            'price_range': p,
            'quantity': int(price_counts[p]),
            'percentage': float(percentages[p])
        })
    return result


def cross_analysis(df, season=None, category=None, reason=None):
    filtered = df.copy()
    if season:
        filtered = filtered[filtered['purchase_season'] == season]
    if category:
        filtered = filtered[filtered['product_category'] == category]
    if reason:
        filtered = filtered[filtered['return_reason'] == reason]

    if filtered.empty:
        return {
            'filters': {'season': season, 'category': category, 'reason': reason},
            'total_records': 0,
            'total_quantity': 0,
            'reason_distribution': {},
            'category_distribution': {},
            'season_distribution': {},
            'price_distribution': {},
            'top_reason': None
        }

    reason_dist = filtered['return_reason'].value_counts().to_dict()
    cat_dist = filtered['product_category'].value_counts().to_dict()
    season_dist = filtered['purchase_season'].value_counts().to_dict()
    price_dist = filtered.groupby('price_range')['quantity'].sum().to_dict()

    top_reason = filtered['return_reason'].value_counts().index[0] if len(filtered) > 0 else None

    return {
        'filters': {'season': season, 'category': category, 'reason': reason},
        'total_records': len(filtered),
        'total_quantity': int(filtered['quantity'].sum()),
        'reason_distribution': reason_dist,
        'category_distribution': cat_dist,
        'season_distribution': season_dist,
        'price_distribution': {k: int(v) for k, v in price_dist.items()},
        'top_reason': top_reason
    }


def season_category_reason_matrix(df):
    seasons = sorted(df['purchase_season'].unique())
    categories = sorted(df['product_category'].unique())

    matrix = {}
    for s in seasons:
        matrix[s] = {}
        for c in categories:
            subset = df[(df['purchase_season'] == s) & (df['product_category'] == c)]
            if len(subset) > 0:
                top = subset['return_reason'].value_counts().index[0]
                count = len(subset)
                matrix[s][c] = {
                    'top_reason': top,
                    'count': count,
                    'total_qty': int(subset['quantity'].sum())
                }
            else:
                matrix[s][c] = {'top_reason': '-', 'count': 0, 'total_qty': 0}
    return {'seasons': seasons, 'categories': categories, 'matrix': matrix}
