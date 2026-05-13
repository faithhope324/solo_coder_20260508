from flask import Blueprint, request, jsonify
from app.db import db
from app.auth.decorators import token_required
import datetime

articles_bp = Blueprint('articles', __name__)

@articles_bp.route('/', methods=['POST'])
@token_required
def create_article():
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    data = request.get_json()
    title = data.get('title')
    content = data.get('content')
    
    if not title or not content:
        return jsonify({'error': 'Missing required fields'}), 400
    
    article = {
        'title': title,
        'content': content,
        'author_id': request.user_id,
        'author_name': request.user['name'],
        'created_at': datetime.datetime.utcnow(),
        'updated_at': datetime.datetime.utcnow()
    }
    
    result = db.articles.insert_one(article)
    article_id = str(result.inserted_id)
    
    return jsonify({'id': article_id, 'title': title, 'content': content, 'author_id': request.user_id, 'author_name': request.user['name'], 'created_at': article['created_at'], 'updated_at': article['updated_at']}), 201

@articles_bp.route('/', methods=['GET'])
def get_articles():
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    articles = list(db.articles.find())
    return jsonify(articles), 200

@articles_bp.route('/<article_id>', methods=['GET'])
def get_article(article_id):
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        article = db.articles.find_one({'_id': article_id})
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        return jsonify(article), 200
    except Exception as e:
        return jsonify({'error': 'Invalid article ID'}), 400

@articles_bp.route('/<article_id>', methods=['PUT'])
@token_required
def update_article(article_id):
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        article = db.articles.find_one({'_id': article_id})
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        
        # 检查是否是文章作者
        if article['author_id'] != request.user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        data = request.get_json()
        update_data = {}
        if 'title' in data:
            update_data['title'] = data['title']
        if 'content' in data:
            update_data['content'] = data['content']
        update_data['updated_at'] = datetime.datetime.utcnow()
        
        db.articles.update_one({'_id': article_id}, {'$set': update_data})
        
        updated_article = db.articles.find_one({'_id': article_id})
        return jsonify(updated_article), 200
    except Exception as e:
        return jsonify({'error': 'Invalid article ID'}), 400

@articles_bp.route('/<article_id>', methods=['DELETE'])
@token_required
def delete_article(article_id):
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    try:
        article = db.articles.find_one({'_id': article_id})
        if not article:
            return jsonify({'error': 'Article not found'}), 404
        
        # 检查是否是文章作者
        if article['author_id'] != request.user_id:
            return jsonify({'error': 'Permission denied'}), 403
        
        db.articles.delete_one({'_id': article_id})
        
        return jsonify({'message': 'Article deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': 'Invalid article ID'}), 400

@articles_bp.route('/user/<user_id>', methods=['GET'])
def get_user_articles(user_id):
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    articles = list(db.articles.find({'author_id': user_id}))
    return jsonify(articles), 200

@articles_bp.route('/search', methods=['GET'])
def search_articles():
    if not db:
        return jsonify({'error': 'Database connection error'}), 500
    
    query = request.args.get('q')
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    articles = list(db.articles.find({'$text': {'$search': query}}))
    return jsonify(articles), 200