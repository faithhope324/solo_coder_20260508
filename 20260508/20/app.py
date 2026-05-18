from flask import Flask, render_template, request
from recommender import CollaborativeFilteringRecommender

app = Flask(__name__)

recommender = CollaborativeFilteringRecommender()

@app.route('/')
def index():
    user_ids = recommender.user_ids
    return render_template('index.html', user_ids=user_ids)

@app.route('/recommend', methods=['GET', 'POST'])
def recommend():
    if request.method == 'POST':
        user_id = int(request.form.get('user_id'))
        top_n = int(request.form.get('top_n', 10))
        k = int(request.form.get('k', 3))
    else:
        user_id = int(request.args.get('user_id', 1))
        top_n = int(request.args.get('top_n', 10))
        k = int(request.args.get('k', 3))
    
    recommendations = recommender.get_recommendations(user_id, top_n=top_n, k=k)
    rated_movies = recommender.get_user_rated_movies(user_id)
    similar_users = recommender.get_similar_users(user_id, top_n=k)
    user_ids = recommender.user_ids
    
    return render_template(
        'recommend.html',
        user_id=user_id,
        recommendations=recommendations,
        rated_movies=rated_movies,
        similar_users=similar_users,
        user_ids=user_ids,
        top_n=top_n,
        k=k
    )

@app.route('/statistics')
def statistics():
    stats = recommender.get_matrix_statistics()
    user_item_matrix, movie_ids = recommender.get_user_item_matrix_data()
    similarity_matrix, user_ids_matrix = recommender.get_similarity_matrix_data()
    
    return render_template(
        'statistics.html',
        stats=stats,
        user_item_matrix=user_item_matrix,
        movie_ids=movie_ids,
        similarity_matrix=similarity_matrix,
        user_ids_matrix=user_ids_matrix
    )

if __name__ == '__main__':
    app.run(debug=True, host='127.0.0.1', port=5001)
