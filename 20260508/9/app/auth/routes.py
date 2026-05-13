from flask import Blueprint, request, jsonify
from app.db import db
from app.auth.utils import AuthUtils
import re

auth_bp = Blueprint('auth', __name__)

def validate_email(email):
    # 修复中文句号问题，先替换为英文句号
    normalized_email = email.replace('。', '.')
    # 标准邮箱格式正则
    email_regex = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return {
        'is_valid': re.match(email_regex, normalized_email) is not None,
        'normalized_email': normalized_email
    }

@auth_bp.route('/register', methods=['POST'])
def register():
    if not db:
        return jsonify({'error': '数据库连接错误'}), 500
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({'error': '请填写所有必填字段'}), 400
    
    # 邮箱格式验证
    email_validation = validate_email(email)
    if not email_validation['is_valid']:
        return jsonify({'error': '邮箱格式错误，请输入有效的邮箱地址，例如：user@qq.com'}), 400
    # 使用标准化后的邮箱
    email = email_validation['normalized_email']
    
    # 密码长度验证
    if len(password) < 6:
        return jsonify({'error': '密码长度至少为6位'}), 400
    
    # 检查邮箱是否已存在
    existing_user = db.users.find_one({'email': email})
    if existing_user:
        return jsonify({'error': '该邮箱已被注册，请使用其他邮箱'}), 400
    
    # 创建新用户
    hashed_password = AuthUtils.hash_password(password)
    user = {
        'name': name,
        'email': email,
        'password': hashed_password
    }
    
    result = db.users.insert_one(user)
    user_id = str(result.inserted_id)
    
    # 生成JWT令牌
    token = AuthUtils.generate_token(user_id)
    
    return jsonify({'token': token, 'user_id': user_id, 'name': name, 'email': email}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    if not db:
        return jsonify({'error': '数据库连接错误'}), 500
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({'error': '请填写邮箱和密码'}), 400
    
    # 邮箱格式验证
    email_validation = validate_email(email)
    if not email_validation['is_valid']:
        return jsonify({'error': '邮箱格式错误，请输入有效的邮箱地址，例如：user@qq.com'}), 400
    # 使用标准化后的邮箱
    email = email_validation['normalized_email']
    
    # 查找用户
    user = db.users.find_one({'email': email})
    if not user:
        return jsonify({'error': '邮箱或密码错误'}), 401
    
    # 验证密码
    if not AuthUtils.verify_password(password, user['password']):
        return jsonify({'error': '邮箱或密码错误'}), 401
    
    # 生成JWT令牌
    user_id = str(user['_id'])
    token = AuthUtils.generate_token(user_id)
    
    return jsonify({'token': token, 'user_id': user_id, 'name': user['name'], 'email': user['email']}), 200