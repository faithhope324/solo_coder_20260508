import os
from flask import Flask, render_template, request, jsonify
from data_loader import load_data, clean_data, get_data_summary
from analysis import (reason_frequency, category_return_rate,
                      price_range_distribution, cross_analysis,
                      season_category_reason_matrix)
from charts import (generate_wordcloud, generate_category_bar,
                    generate_price_pie, generate_cross_bar)

app = Flask(__name__)

DATA_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'returns.csv')


def _get_clean_df():
    raw = load_data(DATA_PATH)
    return clean_data(raw)


@app.route('/')
def index():
    df = _get_clean_df()
    summary = get_data_summary(df)

    reason_freq_data = reason_frequency(df)
    category_data = category_return_rate(df)
    price_data = price_range_distribution(df)

    wordcloud_img = generate_wordcloud(reason_freq_data)
    category_img = generate_category_bar(category_data)
    price_img = generate_price_pie(price_data)

    default_cross = cross_analysis(df, season='夏季', category='服装')
    cross_img = generate_cross_bar(default_cross)

    matrix = season_category_reason_matrix(df)

    return render_template('index.html',
                           summary=summary,
                           wordcloud_img=wordcloud_img,
                           category_img=category_img,
                           price_img=price_img,
                           cross_img=cross_img,
                           cross_data=default_cross,
                           matrix=matrix,
                           categories=summary['categories'],
                           seasons=summary['seasons'],
                           reasons=summary['reasons'])


@app.route('/api/cross_analysis', methods=['POST'])
def api_cross_analysis():
    data = request.get_json() or {}
    season = data.get('season') or None
    category = data.get('category') or None
    reason = data.get('reason') or None

    df = _get_clean_df()
    result = cross_analysis(df, season=season, category=category, reason=reason)
    img = generate_cross_bar(result)

    return jsonify({
        'cross_img': img,
        'cross_data': result
    })


@app.route('/api/matrix')
def api_matrix():
    df = _get_clean_df()
    matrix = season_category_reason_matrix(df)
    return jsonify(matrix)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000, use_reloader=False)
