import json
import os

class ScoreManager:
    def __init__(self, save_path='highscore.json'):
        self.score = 0
        self.distance = 0
        self.high_score = 0
        self.save_path = save_path
        self.speed_multiplier = 1.0
        self.base_speed_increase = 0.0001
        self.max_speed_multiplier = 3.0
        self.load_high_score()

    def load_high_score(self):
        try:
            if os.path.exists(self.save_path):
                with open(self.save_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.high_score = data.get('high_score', 0)
        except (json.JSONDecodeError, IOError):
            self.high_score = 0

    def save_high_score(self):
        try:
            if self.score > self.high_score:
                self.high_score = self.score
                data = {'high_score': self.high_score}
                with open(self.save_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=4)
                return True
        except IOError:
            pass
        return False

    def add_score(self, points):
        self.score += int(points * self.speed_multiplier)

    def update(self, dt):
        self.distance += self.speed_multiplier * dt / 16
        self.score += int(self.speed_multiplier * dt / 50)
        
        if self.speed_multiplier < self.max_speed_multiplier:
            self.speed_multiplier += self.base_speed_increase * dt

    def reset(self):
        self.score = 0
        self.distance = 0
        self.speed_multiplier = 1.0

    def get_score(self):
        return self.score

    def get_high_score(self):
        return self.high_score

    def get_distance(self):
        return int(self.distance)

    def get_speed_multiplier(self):
        return self.speed_multiplier
