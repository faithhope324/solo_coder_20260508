import pygame
import random

class Enemy:
    def __init__(self, x, y, width, height, speed, color):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.speed = speed
        self.color = color
        self.rect = pygame.Rect(x, y, width, height)

    def update(self, dt):
        self.y += self.speed * dt / 16
        self.rect.y = self.y

    def draw(self, screen):
        pygame.draw.rect(screen, self.color, self.rect, border_radius=5)
        
        window_color = (100, 149, 237)
        pygame.draw.rect(screen, window_color, 
                        (self.x + 5, self.y + self.height // 2, self.width - 10, self.height // 3), 
                        border_radius=3)
        
        wheel_color = (30, 30, 30)
        wheel_width = 6
        wheel_height = 10
        pygame.draw.rect(screen, wheel_color, (self.x - 2, self.y + 5, wheel_width, wheel_height))
        pygame.draw.rect(screen, wheel_color, (self.x + self.width - wheel_width + 2, self.y + 5, wheel_width, wheel_height))
        pygame.draw.rect(screen, wheel_color, (self.x - 2, self.y + self.height - wheel_height - 5, wheel_width, wheel_height))
        pygame.draw.rect(screen, wheel_color, (self.x + self.width - wheel_width + 2, self.y + self.height - wheel_height - 5, wheel_width, wheel_height))

        taillight_color = (255, 0, 0)
        pygame.draw.rect(screen, taillight_color, (self.x + 5, self.y + self.height - 2, 8, 4))
        pygame.draw.rect(screen, taillight_color, (self.x + self.width - 13, self.y + self.height - 2, 8, 4))

    def is_off_screen(self, screen_height):
        return self.y > screen_height

    def get_rect(self):
        return self.rect


class EnemySpawner:
    def __init__(self, road_left, road_right, screen_width, screen_height):
        self.road_left = road_left
        self.road_right = road_right
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.enemies = []
        self.spawn_timer = 0
        self.spawn_interval = 1500
        self.base_speed = 3
        self.car_colors = [
            (70, 130, 180),
            (255, 215, 0),
            (50, 205, 50),
            (255, 105, 180),
            (138, 43, 226),
            (255, 165, 0),
            (0, 191, 255),
            (255, 99, 71)
        ]
        self.lanes = 3

    def get_lane_x(self, lane):
        lane_width = (self.road_right - self.road_left) // self.lanes
        car_width = 40
        return self.road_left + lane * lane_width + (lane_width - car_width) // 2

    def spawn(self, current_speed_multiplier):
        lane = random.randint(0, self.lanes - 1)
        x = self.get_lane_x(lane)
        y = -60
        width = 40
        height = 70
        speed = self.base_speed * current_speed_multiplier + random.uniform(1, 3)
        color = random.choice(self.car_colors)
        
        for enemy in self.enemies:
            if abs(enemy.y - y) < 100 and abs(enemy.x - x) < 50:
                return
        
        self.enemies.append(Enemy(x, y, width, height, speed, color))

    def update(self, dt, current_speed_multiplier):
        self.spawn_timer += dt
        adjusted_interval = max(self.spawn_interval / current_speed_multiplier, 500)
        
        if self.spawn_timer >= adjusted_interval:
            self.spawn(current_speed_multiplier)
            self.spawn_timer = 0

        for enemy in self.enemies:
            enemy.update(dt)

        self.enemies = [enemy for enemy in self.enemies if not enemy.is_off_screen(self.screen_height)]

    def draw(self, screen):
        for enemy in self.enemies:
            enemy.draw(screen)

    def get_enemies(self):
        return self.enemies

    def reset(self):
        self.enemies = []
        self.spawn_timer = 0
