from functools import wraps
from flask import request, jsonify
from app.auth.utils import AuthUtils
from app.db import db

def token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is required'}), 401
        
        # 移除Bearer前缀
        if token.startswith('Bearer '):
            token = token[7:]
        
        user_id = AuthUtils.verify_token(token)
        if not user_id:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        # 查找用户
        user = db.users.find_one({'_id': user_id})
        if not user:
            return jsonify({'error': 'User not found'}), 401
        
        # 将用户信息添加到请求上下文
        request.user_id = user_id
        request.user = user
        
        return f(*args, **kwargs)
    return decorated_function