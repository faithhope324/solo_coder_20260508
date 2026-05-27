import random
from config import *

class Fish:
    def __init__(self, name, color, size, base_score, difficulty, qte_speed, qte_count, min_depth, max_depth):
        self.name = name
        self.color = color
        self.size = size
        self.base_score = base_score
        self.difficulty = difficulty
        self.qte_speed = qte_speed
        self.qte_count = qte_count
        self.min_depth = min_depth
        self.max_depth = max_depth

class FishDatabase:
    def __init__(self):
        self.fishes = [
            Fish("小鲫鱼", (200, 200, 100), 20, 10, 1, 1.0, 3, 0, 0.3),
            Fish("鲤鱼", (255, 100, 100), 35, 25, 2, 1.2, 4, 0.2, 0.5),
            Fish("草鱼", (100, 200, 100), 40, 35, 3, 1.4, 5, 0.3, 0.6),
            Fish("鲈鱼", (100, 150, 200), 30, 40, 3, 1.5, 5, 0.4, 0.7),
            Fish("黑鱼", (50, 50, 50), 45, 60, 4, 1.8, 6, 0.5, 0.8),
            Fish("鳜鱼", (200, 150, 100), 38, 80, 5, 2.0, 7, 0.6, 0.9),
            Fish("鲶鱼", (80, 80, 150), 50, 100, 6, 2.2, 8, 0.7, 1.0),
            Fish("金龙鱼", (255, 215, 0), 55, 200, 8, 2.5, 10, 0.8, 1.0),
        ]

    def get_random_fish(self, depth_ratio, weather_bonus=0):
        eligible = []
        weights = []
        for fish in self.fishes:
            if fish.min_depth <= depth_ratio <= fish.max_depth:
                depth_match = 1.0
                mid_depth = (fish.min_depth + fish.max_depth) / 2
                depth_match = 1.0 - abs(depth_ratio - mid_depth) * 2
                weight = depth_match * (1.0 / fish.difficulty) * (1 + weather_bonus)
                eligible.append(fish)
                weights.append(max(0.1, weight))

        if not eligible:
            return self.fishes[0]

        total = sum(weights)
        r = random.random() * total
        cumulative = 0
        for fish, w in zip(eligible, weights):
            cumulative += w
            if r <= cumulative:
                return fish
        return eligible[0]

    def draw_fish(self, screen, fish, x, y, direction=1):
        body_width = fish.size * 1.5
        body_height = fish.size * 0.6

        pygame.draw.ellipse(screen, fish.color, (x - body_width / 2, y - body_height / 2, body_width, body_height))

        tail_width = fish.size * 0.4
        tail_height = fish.size * 0.8
        tail_x = x - body_width / 2 - tail_width / 2 if direction > 0 else x + body_width / 2 + tail_width / 2
        pygame.draw.polygon(screen, fish.color, [
            (tail_x, y),
            (tail_x + tail_width * direction, y - tail_height / 2),
            (tail_x + tail_width * direction, y + tail_height / 2)
        ])

        eye_x = x + body_width / 3 * direction
        eye_y = y - body_height / 6
        pygame.draw.circle(screen, WHITE, (eye_x, eye_y), fish.size * 0.1)
        pygame.draw.circle(screen, BLACK, (eye_x, eye_y), fish.size * 0.05)

        fin_width = fish.size * 0.3
        fin_height = fish.size * 0.2
        pygame.draw.polygon(screen, fish.color, [
            (x, y - body_height / 2),
            (x - fin_width / 2, y - body_height / 2 - fin_height),
            (x + fin_width / 2, y - body_height / 2 - fin_height)
        ])
