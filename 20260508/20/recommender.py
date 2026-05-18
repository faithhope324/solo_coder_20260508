import pandas as pd
import numpy as np
from collections import defaultdict
import os

class CollaborativeFilteringRecommender:
    def __init__(self, data_dir='data'):
        self.data_dir = data_dir
        self.ratings_df = None
        self.movies_df = None
        self.user_item_matrix = None
        self.user_similarity = None
        self.user_ids = None
        self.movie_ids = None
        self.movie_id_to_title = {}
        self.load_data()
        self.build_user_item_matrix()
        self.compute_user_similarity()

    def load_data(self):
        ratings_path = os.path.join(self.data_dir, 'ratings.csv')
        movies_path = os.path.join(self.data_dir, 'movies.csv')
        
        self.ratings_df = pd.read_csv(ratings_path)
        self.movies_df = pd.read_csv(movies_path)
        
        for _, row in self.movies_df.iterrows():
            self.movie_id_to_title[row['movieId']] = row['title']

    def build_user_item_matrix(self):
        self.user_ids = sorted(self.ratings_df['userId'].unique())
        self.movie_ids = sorted(self.ratings_df['movieId'].unique())
        
        n_users = len(self.user_ids)
        n_movies = len(self.movie_ids)
        
        self.user_item_matrix = np.zeros((n_users, n_movies))
        
        user_idx = {uid: i for i, uid in enumerate(self.user_ids)}
        movie_idx = {mid: j for j, mid in enumerate(self.movie_ids)}
        
        for _, row in self.ratings_df.iterrows():
            u = user_idx[row['userId']]
            m = movie_idx[row['movieId']]
            self.user_item_matrix[u, m] = row['rating']

    def cosine_similarity(self, vec1, vec2):
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        return dot_product / (norm1 * norm2)

    def compute_user_similarity(self):
        n_users = len(self.user_ids)
        self.user_similarity = np.zeros((n_users, n_users))
        
        for i in range(n_users):
            for j in range(i, n_users):
                if i == j:
                    self.user_similarity[i, j] = 1.0
                else:
                    sim = self.cosine_similarity(
                        self.user_item_matrix[i, :],
                        self.user_item_matrix[j, :]
                    )
                    self.user_similarity[i, j] = sim
                    self.user_similarity[j, i] = sim

    def get_user_index(self, user_id):
        if user_id in self.user_ids:
            return self.user_ids.index(user_id)
        return None

    def predict_rating(self, user_idx, movie_idx, k=3):
        if self.user_item_matrix[user_idx, movie_idx] > 0:
            return self.user_item_matrix[user_idx, movie_idx]
        
        similarities = self.user_similarity[user_idx, :]
        ratings = self.user_item_matrix[:, movie_idx]
        
        rated_users = np.where(ratings > 0)[0]
        
        if len(rated_users) == 0:
            return np.mean(self.user_item_matrix[user_idx, :][self.user_item_matrix[user_idx, :] > 0])
        
        similar_users = sorted(
            rated_users,
            key=lambda x: similarities[x],
            reverse=True
        )[:k]
        
        if len(similar_users) == 0:
            return np.mean(ratings[rated_users])
        
        total_sim = 0.0
        weighted_sum = 0.0
        
        for u in similar_users:
            sim = similarities[u]
            if sim > 0:
                weighted_sum += sim * ratings[u]
                total_sim += sim
        
        if total_sim == 0:
            return np.mean(ratings[rated_users])
        
        return weighted_sum / total_sim

    def get_recommendations(self, user_id, top_n=10, k=3):
        user_idx = self.get_user_index(user_id)
        if user_idx is None:
            return []
        
        user_ratings = self.user_item_matrix[user_idx, :]
        unrated_movies = np.where(user_ratings == 0)[0]
        
        predictions = []
        for movie_idx in unrated_movies:
            pred_rating = self.predict_rating(user_idx, movie_idx, k)
            movie_id = self.movie_ids[movie_idx]
            title = self.movie_id_to_title.get(movie_id, f"Movie {movie_id}")
            predictions.append({
                'movieId': movie_id,
                'title': title,
                'predicted_rating': round(pred_rating, 2)
            })
        
        predictions.sort(key=lambda x: x['predicted_rating'], reverse=True)
        return predictions[:top_n]

    def get_user_rated_movies(self, user_id):
        user_idx = self.get_user_index(user_id)
        if user_idx is None:
            return []
        
        user_ratings = self.user_item_matrix[user_idx, :]
        rated_movies = np.where(user_ratings > 0)[0]
        
        rated = []
        for movie_idx in rated_movies:
            movie_id = self.movie_ids[movie_idx]
            title = self.movie_id_to_title.get(movie_id, f"Movie {movie_id}")
            rated.append({
                'movieId': movie_id,
                'title': title,
                'rating': user_ratings[movie_idx]
            })
        
        rated.sort(key=lambda x: x['rating'], reverse=True)
        return rated

    def get_similar_users(self, user_id, top_n=5):
        user_idx = self.get_user_index(user_id)
        if user_idx is None:
            return []
        
        similarities = self.user_similarity[user_idx, :]
        similar_users = []
        
        for i, sim in enumerate(similarities):
            if i != user_idx:
                similar_users.append({
                    'userId': self.user_ids[i],
                    'similarity': round(sim, 4)
                })
        
        similar_users.sort(key=lambda x: x['similarity'], reverse=True)
        return similar_users[:top_n]

    def get_matrix_statistics(self):
        n_users = len(self.user_ids)
        n_movies = len(self.movie_ids)
        total_ratings = np.count_nonzero(self.user_item_matrix)
        sparsity = 1 - (total_ratings / (n_users * n_movies))
        
        ratings = self.user_item_matrix[self.user_item_matrix > 0]
        avg_rating = np.mean(ratings)
        min_rating = np.min(ratings)
        max_rating = np.max(ratings)
        
        user_ratings_count = np.count_nonzero(self.user_item_matrix, axis=1)
        avg_ratings_per_user = np.mean(user_ratings_count)
        min_ratings_per_user = np.min(user_ratings_count)
        max_ratings_per_user = np.max(user_ratings_count)
        
        movie_ratings_count = np.count_nonzero(self.user_item_matrix, axis=0)
        avg_ratings_per_movie = np.mean(movie_ratings_count)
        min_ratings_per_movie = np.min(movie_ratings_count)
        max_ratings_per_movie = np.max(movie_ratings_count)
        
        sim_values = self.user_similarity[np.triu_indices(n_users, k=1)]
        avg_similarity = np.mean(sim_values) if len(sim_values) > 0 else 0
        min_similarity = np.min(sim_values) if len(sim_values) > 0 else 0
        max_similarity = np.max(sim_values) if len(sim_values) > 0 else 0
        
        return {
            'n_users': n_users,
            'n_movies': n_movies,
            'total_ratings': total_ratings,
            'sparsity': round(sparsity * 100, 2),
            'avg_rating': round(avg_rating, 2),
            'min_rating': min_rating,
            'max_rating': max_rating,
            'avg_ratings_per_user': round(avg_ratings_per_user, 2),
            'min_ratings_per_user': min_ratings_per_user,
            'max_ratings_per_user': max_ratings_per_user,
            'avg_ratings_per_movie': round(avg_ratings_per_movie, 2),
            'min_ratings_per_movie': min_ratings_per_movie,
            'max_ratings_per_movie': max_ratings_per_movie,
            'avg_similarity': round(avg_similarity, 4),
            'min_similarity': round(min_similarity, 4),
            'max_similarity': round(max_similarity, 4)
        }

    def get_user_item_matrix_data(self):
        matrix_data = []
        for i, user_id in enumerate(self.user_ids):
            row = {'userId': user_id}
            for j, movie_id in enumerate(self.movie_ids):
                rating = self.user_item_matrix[i, j]
                row[str(movie_id)] = rating if rating > 0 else '-'
            matrix_data.append(row)
        return matrix_data, self.movie_ids

    def get_similarity_matrix_data(self):
        matrix_data = []
        for i, user_id in enumerate(self.user_ids):
            row = {'userId': user_id}
            for j, other_user_id in enumerate(self.user_ids):
                sim = self.user_similarity[i, j]
                row[str(other_user_id)] = round(sim, 4)
            matrix_data.append(row)
        return matrix_data, self.user_ids
