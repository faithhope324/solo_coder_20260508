import hashlib
import time
import base64
import json

class AuthUtils:
    @staticmethod
    def hash_password(password):
        # 使用SHA256进行密码哈希
        return hashlib.sha256(password.encode()).hexdigest()
    
    @staticmethod
    def verify_password(password, hashed_password):
        # 验证密码
        return hashlib.sha256(password.encode()).hexdigest() == hashed_password
    
    @staticmethod
    def generate_token(user_id):
        # 生成简单的令牌
        payload = {'user_id': user_id, 'timestamp': time.time()}
        payload_str = json.dumps(payload)
        token = base64.b64encode(payload_str.encode()).decode()
        return token
    
    @staticmethod
    def verify_token(token):
        try:
            # 验证令牌
            payload_str = base64.b64decode(token).decode()
            payload = json.loads(payload_str)
            # 简单的令牌验证，检查是否过期（24小时）
            if time.time() - payload['timestamp'] > 86400:
                return None
            return payload['user_id']
        except:
            return None