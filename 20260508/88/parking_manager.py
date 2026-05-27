import json
import time
from dataclasses import dataclass, asdict
from typing import Optional
from redis_client import get_redis
from config import settings

SPOT_KEY_PREFIX = "parking:spot:"
RESERVATION_KEY_PREFIX = "parking:reservation:"
ALL_SPOTS_KEY = "parking:all_spots"


@dataclass
class SpotStatus:
    spot_id: str
    status: str = "free"
    user_id: Optional[str] = None
    reserved_at: Optional[float] = None
    expires_at: Optional[float] = None


class ParkingManager:
    def __init__(self):
        self.redis = get_redis()
        self.rows = settings.parking_grid_rows
        self.cols = settings.parking_grid_cols
        self.duration_sec = settings.reservation_duration_minutes * 60

    def generate_spot_id(self, row: int, col: int) -> str:
        return f"A{row + 1}-{col + 1}"

    def initialize_grid(self):
        existing = self.redis.smembers(ALL_SPOTS_KEY)
        if existing:
            return
        for row in range(self.rows):
            for col in range(self.cols):
                spot_id = self.generate_spot_id(row, col)
                self._save_spot(SpotStatus(spot_id=spot_id))
                self.redis.sadd(ALL_SPOTS_KEY, spot_id)

    def _save_spot(self, spot: SpotStatus):
        self.redis.set(
            SPOT_KEY_PREFIX + spot.spot_id,
            json.dumps(asdict(spot), ensure_ascii=False),
        )

    def _load_spot(self, spot_id: str) -> Optional[SpotStatus]:
        raw = self.redis.get(SPOT_KEY_PREFIX + spot_id)
        if raw is None:
            return None
        data = json.loads(raw)
        return SpotStatus(**data)

    def _broadcast(self, spot: SpotStatus):
        from websocket_manager import broadcast_spot_update
        broadcast_spot_update(asdict(spot))

    def get_all_spots(self) -> list[SpotStatus]:
        self.initialize_grid()
        self._auto_release_expired()
        spot_ids = sorted(self.redis.smembers(ALL_SPOTS_KEY))
        return [self._load_spot(sid) for sid in spot_ids]

    def get_spot(self, spot_id: str) -> Optional[SpotStatus]:
        self._auto_release_expired()
        return self._load_spot(spot_id)

    def reserve_spot(self, spot_id: str, user_id: str) -> SpotStatus:
        self._auto_release_expired()
        spot = self._load_spot(spot_id)
        if spot is None:
            raise ValueError(f"车位 {spot_id} 不存在")
        if spot.status != "free":
            raise ValueError(f"车位 {spot_id} 已被占用或预订")

        now = time.time()
        spot.status = "reserved"
        spot.user_id = user_id
        spot.reserved_at = now
        spot.expires_at = now + self.duration_sec

        self._save_spot(spot)
        self.redis.setex(
            RESERVATION_KEY_PREFIX + spot_id,
            self.duration_sec,
            user_id,
        )
        self._broadcast(spot)
        return spot

    def release_spot(self, spot_id: str) -> SpotStatus:
        spot = self._load_spot(spot_id)
        if spot is None:
            raise ValueError(f"车位 {spot_id} 不存在")

        spot.status = "free"
        spot.user_id = None
        spot.reserved_at = None
        spot.expires_at = None

        self._save_spot(spot)
        self.redis.delete(RESERVATION_KEY_PREFIX + spot_id)
        self._broadcast(spot)
        return spot

    def confirm_parking(self, spot_id: str, user_id: str) -> SpotStatus:
        spot = self._load_spot(spot_id)
        if spot is None:
            raise ValueError(f"车位 {spot_id} 不存在")
        if spot.status != "reserved" or spot.user_id != user_id:
            raise ValueError("只有预订者可以确认停车")

        spot.status = "occupied"
        self._save_spot(spot)
        self.redis.delete(RESERVATION_KEY_PREFIX + spot_id)
        self._broadcast(spot)
        return spot

    def leave_spot(self, spot_id: str, user_id: str) -> SpotStatus:
        spot = self._load_spot(spot_id)
        if spot is None:
            raise ValueError(f"车位 {spot_id} 不存在")
        if spot.user_id != user_id:
            raise ValueError("只有使用该车的用户可以释放")

        spot.status = "free"
        spot.user_id = None
        spot.reserved_at = None
        spot.expires_at = None

        self._save_spot(spot)
        self.redis.delete(RESERVATION_KEY_PREFIX + spot_id)
        self._broadcast(spot)
        return spot

    def _auto_release_expired(self):
        now = time.time()
        spot_ids = self.redis.smembers(ALL_SPOTS_KEY)
        for sid in spot_ids:
            spot = self._load_spot(sid)
            if spot and spot.status == "reserved" and spot.expires_at and spot.expires_at <= now:
                spot.status = "free"
                spot.user_id = None
                spot.reserved_at = None
                spot.expires_at = None
                self._save_spot(spot)
                self.redis.delete(RESERVATION_KEY_PREFIX + sid)
                self._broadcast(spot)


parking_manager = ParkingManager()