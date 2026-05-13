import uuid
from datetime import datetime

# 内存数据库模拟
class MockDB:
    def __init__(self):
        self.users = []
        self.articles = []
    
    def find_one(self, collection, query):
        if collection == 'users':
            for user in self.users:
                if 'email' in query and user['email'] == query['email']:
                    return user
                if '_id' in query and user['_id'] == query['_id']:
                    return user
        elif collection == 'articles':
            for article in self.articles:
                if '_id' in query and article['_id'] == query['_id']:
                    return article
        return None
    
    def insert_one(self, collection, document):
        if collection == 'users':
            document['_id'] = str(uuid.uuid4())
            self.users.append(document)
            return type('obj', (object,), {'inserted_id': document['_id']})
        elif collection == 'articles':
            document['_id'] = str(uuid.uuid4())
            self.articles.append(document)
            return type('obj', (object,), {'inserted_id': document['_id']})
    
    def find(self, collection, query=None):
        if collection == 'users':
            return self.users
        elif collection == 'articles':
            if not query:
                return self.articles
            elif '$text' in query:
                # 简单的文本搜索模拟
                search_term = query['$text']['$search']
                results = []
                for article in self.articles:
                    if search_term in article['title'] or search_term in article['content']:
                        results.append(article)
                return results
            elif 'author_id' in query:
                return [article for article in self.articles if article['author_id'] == query['author_id']]
            return self.articles
    
    def update_one(self, collection, query, update):
        if collection == 'articles':
            for article in self.articles:
                if article['_id'] == query['_id']:
                    article.update(update['$set'])
                    return True
        return False
    
    def delete_one(self, collection, query):
        if collection == 'articles':
            for i, article in enumerate(self.articles):
                if article['_id'] == query['_id']:
                    del self.articles[i]
                    return True
        return False

# 创建模拟数据库实例
mock_db = MockDB()

# 模拟db对象
db = type('obj', (object,), {
    'users': type('obj', (object,), {
        'find_one': lambda query: mock_db.find_one('users', query),
        'insert_one': lambda document: mock_db.insert_one('users', document),
        'find': lambda query=None: mock_db.find('users', query),
        'create_index': lambda *args, **kwargs: None
    }),
    'articles': type('obj', (object,), {
        'find_one': lambda query: mock_db.find_one('articles', query),
        'insert_one': lambda document: mock_db.insert_one('articles', document),
        'find': lambda query=None: mock_db.find('articles', query),
        'update_one': lambda query, update: mock_db.update_one('articles', query, update),
        'delete_one': lambda query: mock_db.delete_one('articles', query),
        'create_index': lambda *args, **kwargs: None
    })
})()