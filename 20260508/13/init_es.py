from elasticsearch import Elasticsearch

INDEX_NAME = "access_logs"

INDEX_MAPPING = {
    "mappings": {
        "properties": {
            "timestamp": {
                "type": "date"
            },
            "ip": {
                "type": "keyword"
            },
            "user_agent": {
                "type": "text",
                "fields": {
                    "keyword": {
                        "type": "keyword",
                        "ignore_above": 256
                    }
                }
            },
            "path": {
                "type": "keyword"
            },
            "method": {
                "type": "keyword"
            }
        }
    }
}


def get_es_client():
    es = Elasticsearch(["http://localhost:9200"])
    if not es.ping():
        raise Exception("无法连接到 Elasticsearch")
    return es


def init_index():
    es = get_es_client()
    
    if not es.indices.exists(index=INDEX_NAME):
        es.indices.create(index=INDEX_NAME, body=INDEX_MAPPING)
        print(f"索引 '{INDEX_NAME}' 创建成功！")
    else:
        print(f"索引 '{INDEX_NAME}' 已存在。")
    
    return es


if __name__ == "__main__":
    try:
        init_index()
        print("Elasticsearch 初始化完成！")
    except Exception as e:
        print(f"初始化失败: {e}")
