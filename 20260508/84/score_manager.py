import json
import os

HIGHSCORE_FILE = "highscore.json"


class ScoreManager:
    def __init__(self):
        self.score = 0
        self.lives = 3
        self.high_score = self._load_high_score()

    def _load_high_score(self):
        if os.path.exists(HIGHSCORE_FILE):
            try:
                with open(HIGHSCORE_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("high_score", 0)
            except (json.JSONDecodeError, IOError):
                return 0
        return 0

    def save_high_score(self):
        if self.score > self.high_score:
            self.high_score = self.score
            try:
                with open(HIGHSCORE_FILE, "w", encoding="utf-8") as f:
                    json.dump({"high_score": self.high_score}, f, ensure_ascii=False, indent=2)
            except IOError:
                pass

    def add_score(self, points):
        self.score += points

    def subtract_score(self, points):
        self.score = max(0, self.score - points)

    def lose_life(self):
        self.lives -= 1

    def is_game_over(self):
        return self.lives <= 0

    def reset(self):
        self.score = 0
        self.lives = 3

    def get_speed_multiplier(self):
        return 1.0 + (self.score // 30) * 0.15

    def get_spawn_multiplier(self):
        return max(0.4, 1.0 - (self.score // 50) * 0.08)
