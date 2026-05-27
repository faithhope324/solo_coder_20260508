import redis
from config import settings


redis_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=settings.redis_db,
            password=settings.redis_password or None,
            decode_responses=True,
        )
        redis_client.ping()
    return redis_client


def close_redis():
    global redis_client
    if redis_client is not None:
        redis_client.close()
        redis_client = None