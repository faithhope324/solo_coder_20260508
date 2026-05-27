import pandas as pd
import numpy as np
from scipy import stats
import json

ANALYSIS_COLUMNS = ['rating', 'wait_time', 'taste', 'service']
COLUMN_NAMES = {
    'rating': '总体评分',
    'wait_time': '等待时间',
    'taste': '菜品口味',
    'service': '服务态度'
}

def calculate_correlation(df, columns=None):
    if columns is None:
        columns = ANALYSIS_COLUMNS
    
    missing_cols = [col for col in columns if col not in df.columns]
    if missing_cols:
        raise ValueError(f"数据缺少必要列: {missing_cols}")
    
    df_analysis = df[columns].copy()
    
    corr_matrix = pd.DataFrame(index=columns, columns=columns, dtype=float)
    p_matrix = pd.DataFrame(index=columns, columns=columns, dtype=float)
    
    for i, col1 in enumerate(columns):
        for j, col2 in enumerate(columns):
            if i == j:
                corr_matrix.loc[col1, col2] = 1.0
                p_matrix.loc[col1, col2] = 0.0
            else:
                valid_data = df_analysis[[col1, col2]].dropna()
                if len(valid_data) >= 2:
                    corr, p_value = stats.pearsonr(valid_data[col1], valid_data[col2])
                    corr_matrix.loc[col1, col2] = round(corr, 4)
                    p_matrix.loc[col1, col2] = round(p_value, 6)
                else:
                    corr_matrix.loc[col1, col2] = 0.0
                    p_matrix.loc[col1, col2] = 1.0
    
    return corr_matrix, p_matrix

def generate_heatmap_data(corr_matrix, column_names=None):
    if column_names is None:
        column_names = COLUMN_NAMES
    
    columns = list(corr_matrix.columns)
    
    x_axis = [column_names.get(col, col) for col in columns]
    y_axis = [column_names.get(col, col) for col in columns]
    
    matrix = corr_matrix.values.tolist()
    
    heatmap_data = []
    for i in range(len(columns)):
        for j in range(len(columns)):
            heatmap_data.append([j, i, round(matrix[i][j], 2)])
    
    return {
        'x_axis': x_axis,
        'y_axis': y_axis,
        'matrix': matrix,
        'heatmap_data': heatmap_data,
        'raw_columns': columns
    }

def calculate_overview_stats(df):
    if df is None or len(df) == 0:
        return {
            'total_reviews': 0,
            'avg_rating': 0,
            'avg_wait_time': 0,
            'avg_taste': 0,
            'avg_service': 0,
            'max_rating': 0,
            'min_rating': 0,
            'date_range': [None, None]
        }
    
    total_reviews = int(len(df))
    avg_rating = float(round(df['rating'].mean(), 2))
    avg_wait_time = float(round(df['wait_time'].mean(), 1))
    avg_taste = float(round(df['taste'].mean(), 2))
    avg_service = float(round(df['service'].mean(), 2))
    max_rating = float(round(df['rating'].max(), 1))
    min_rating = float(round(df['rating'].min(), 1))
    
    date_range = [
        df['review_date'].min().strftime('%Y-%m-%d'),
        df['review_date'].max().strftime('%Y-%m-%d')
    ]
    
    rating_distribution = calculate_rating_distribution(df)
    
    return {
        'total_reviews': total_reviews,
        'avg_rating': avg_rating,
        'avg_wait_time': avg_wait_time,
        'avg_taste': avg_taste,
        'avg_service': avg_service,
        'max_rating': max_rating,
        'min_rating': min_rating,
        'date_range': date_range,
        'rating_distribution': rating_distribution
    }

def calculate_rating_distribution(df):
    if df is None or len(df) == 0:
        return []
    
    bins = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]
    labels = ['1星', '2星', '3星', '4星', '5星']
    df['rating_level'] = pd.cut(df['rating'], bins=bins, labels=labels, right=True)
    
    distribution = df['rating_level'].value_counts().sort_index()
    result = []
    for label in labels:
        count = distribution.get(label, 0)
        percentage = float(round(count / len(df) * 100, 1)) if len(df) > 0 else 0.0
        result.append({
            'level': label,
            'count': int(count),
            'percentage': percentage
        })
    
    return result

def calculate_correlation_insights(corr_matrix, column_names=None):
    if column_names is None:
        column_names = COLUMN_NAMES
    
    insights = []
    columns = list(corr_matrix.columns)
    
    rating_corrs = corr_matrix['rating'].drop('rating')
    
    strongest_positive = rating_corrs.idxmax()
    strongest_positive_value = rating_corrs.max()
    insights.append({
        'type': 'positive',
        'factor': column_names.get(strongest_positive, strongest_positive),
        'correlation': round(strongest_positive_value, 2),
        'description': f"{column_names.get(strongest_positive, strongest_positive)}与总体评分的正相关性最强，相关系数为{round(strongest_positive_value, 2)}"
    })
    
    strongest_negative = rating_corrs.idxmin()
    strongest_negative_value = rating_corrs.min()
    if strongest_negative_value < 0:
        insights.append({
            'type': 'negative',
            'factor': column_names.get(strongest_negative, strongest_negative),
            'correlation': round(strongest_negative_value, 2),
            'description': f"{column_names.get(strongest_negative, strongest_negative)}与总体评分呈负相关，相关系数为{round(strongest_negative_value, 2)}，说明该因素越差，评分越低"
        })
    
    return insights
