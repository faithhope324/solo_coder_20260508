import asyncio
import json
import time
from contextlib import asynccontextmanager
from typing import Dict, Optional

import redis.asyncio as redis
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse

RATE_LIMIT = 10
WINDOW_SECONDS = 60
REDIS_KEY_PREFIX = "rate_limit:"
STATS_KEY = "request_stats"

WHITELIST_PATHS = {
    "/",
    "/stats",
    "/stream",
    "/favicon.ico",
    "/docs",
    "/openapi.json",
    "/redoc",
}

redis_client = None

fallback_cache: Dict[str, Dict] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global redis_client
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)
    try:
        await redis_client.ping()
        print("Connected to Redis successfully")
    except Exception as e:
        print(f"Redis connection failed: {e}")
    yield
    try:
        await redis_client.close()
    except Exception:
        pass


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip

    cf_connecting_ip = request.headers.get("CF-Connecting-IP")
    if cf_connecting_ip:
        return cf_connecting_ip

    x_forwarded = request.headers.get("X-Forwarded")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()

    return request.client.host or "unknown"


async def redis_incr(key: str, ex: Optional[int] = None) -> Optional[int]:
    try:
        count = await redis_client.incr(key)
        if ex and count == 1:
            await redis_client.expire(key, ex)
        return count
    except Exception as e:
        print(f"Redis incr failed: {e}")
        return None


async def redis_hincrby(key: str, field: str, amount: int = 1) -> None:
    try:
        await redis_client.hincrby(key, field, amount)
    except Exception as e:
        pass


async def redis_hgetall(key: str) -> Dict:
    try:
        return await redis_client.hgetall(key)
    except Exception as e:
        print(f"Redis hgetall failed: {e}")
        return {}


async def redis_get(key: str) -> Optional[str]:
    try:
        return await redis_client.get(key)
    except Exception as e:
        print(f"Redis get failed: {e}")
        return None


def fallback_incr(key: str, ex: int) -> int:
    now = time.time()
    current = fallback_cache.get(key, {"count": 0, "expire": now + ex})

    if now > current["expire"]:
        current = {"count": 0, "expire": now + ex}

    current["count"] += 1
    fallback_cache[key] = current
    return current["count"]


def cleanup_fallback_cache():
    now = time.time()
    expired_keys = [k for k, v in fallback_cache.items() if now > v["expire"]]
    for k in expired_keys:
        del fallback_cache[k]


async def rate_limit_middleware(request: Request, call_next):
    if request.url.path in WHITELIST_PATHS:
        return await call_next(request)

    client_ip = get_client_ip(request)
    current_minute = int(time.time() // WINDOW_SECONDS)
    key = f"{REDIS_KEY_PREFIX}{client_ip}:{current_minute}"

    count = await redis_incr(key, ex=WINDOW_SECONDS)

    if count is None:
        count = fallback_incr(key, ex=WINDOW_SECONDS)

    stats_key = f"{STATS_KEY}:{current_minute}"
    await redis_hincrby(stats_key, client_ip, 1)

    if count >= RATE_LIMIT:
        return Response(
            content='{"detail": "Too many requests"}',
            status_code=429,
            media_type="application/json"
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT)
    response.headers["X-RateLimit-Remaining"] = str(max(0, RATE_LIMIT - count))
    return response


app.middleware("http")(rate_limit_middleware)


@app.get("/", response_class=HTMLResponse)
async def root():
    with open("index.html", "r", encoding="utf-8") as f:
        return f.read()


@app.get("/api/test")
async def test_endpoint():
    return {"message": "Hello, World!", "timestamp": time.time()}


@app.get("/stats")
async def get_stats():
    cleanup_fallback_cache()
    current_minute = int(time.time() // WINDOW_SECONDS)
    stats_key = f"{STATS_KEY}:{current_minute}"
    stats = await redis_hgetall(stats_key)
    result = []
    for ip, count in stats.items():
        rate_key = f"{REDIS_KEY_PREFIX}{ip}:{current_minute}"
        rate_count = await redis_get(rate_key)
        current_count = int(rate_count) if rate_count else 0
        result.append({
            "ip": ip,
            "count": current_count,
            "limit": RATE_LIMIT,
            "remaining": max(0, RATE_LIMIT - current_count)
        })
    result.sort(key=lambda x: x["count"], reverse=True)
    return {"stats": result, "window_seconds": WINDOW_SECONDS}


async def event_generator():
    while True:
        cleanup_fallback_cache()
        current_minute = int(time.time() // WINDOW_SECONDS)
        stats_key = f"{STATS_KEY}:{current_minute}"
        stats = await redis_hgetall(stats_key)
        result = []
        for ip, count in stats.items():
            rate_key = f"{REDIS_KEY_PREFIX}{ip}:{current_minute}"
            rate_count = await redis_get(rate_key)
            current_count = int(rate_count) if rate_count else 0
            result.append({
                "ip": ip,
                "count": current_count,
                "limit": RATE_LIMIT,
                "remaining": max(0, RATE_LIMIT - current_count)
            })
        result.sort(key=lambda x: x["count"], reverse=True)
        data = {"stats": result, "timestamp": time.time()}
        yield f"data: {json.dumps(data)}\n\n"
        await asyncio.sleep(1)


@app.get("/stream")
async def stream():
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        },
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
