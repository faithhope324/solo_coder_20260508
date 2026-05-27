import math
from config import *

class CastingSystem:
    def __init__(self):
        self.state = "idle"
        self.power = 0
        self.power_direction = 1
        self.angle = 45
        self.angle_direction = 1
        self.max_power = 100
        self.cast_x = 0
        self.cast_y = 0
        self.bobber_x = 0
        self.bobber_y = 0
        self.bobber_depth = 0
        self.max_depth = 200
        self.sinking = False
        self.sink_speed = 2
        self.power_bar_width = 200
        self.power_bar_height = 30
        self.optimal_zone_start = 60
        self.optimal_zone_end = 85

    def start_charging(self, rod_bonus=0):
        if self.state == "idle":
            self.state = "charging"
            self.power = 0
            self.power_direction = 1
            self.optimal_zone_start = 60 - rod_bonus * 10
            self.optimal_zone_end = 85 + rod_bonus * 10

    def update_charging(self):
        if self.state == "charging":
            self.power += self.power_direction * 2
            if self.power >= self.max_power:
                self.power = self.max_power
                self.power_direction = -1
            elif self.power <= 0:
                self.power = 0
                self.power_direction = 1

    def cast(self, player_x, player_y):
        if self.state == "charging":
            self.state = "casting"
            base_distance = 200 + self.power * 6
            self.bobber_x = player_x + base_distance
            self.bobber_y = WATER_TOP
            self.sinking = True
            self.bobber_depth = 0
            return True
        return False

    def update(self):
        if self.state == "casting" and self.sinking:
            self.bobber_depth += self.sink_speed
            self.bobber_y = WATER_TOP + self.bobber_depth
            if self.bobber_depth >= self.max_depth:
                self.sinking = False
                self.state = "waiting"

    def is_in_optimal_zone(self):
        return self.optimal_zone_start <= self.power <= self.optimal_zone_end

    def get_landing_accuracy(self):
        if self.power < self.optimal_zone_start:
            return 0.5 + (self.power / self.optimal_zone_start) * 0.5
        elif self.power > self.optimal_zone_end:
            over = self.power - self.optimal_zone_end
            max_over = self.max_power - self.optimal_zone_end
            return 1.0 - (over / max_over) * 0.5
        return 1.0

    def get_depth_ratio(self):
        return min(1.0, self.bobber_depth / self.max_depth)

    def reset(self):
        self.state = "idle"
        self.power = 0
        self.bobber_depth = 0
        self.sinking = False

    def draw_power_bar(self, screen, x, y, font):
        pygame.draw.rect(screen, GRAY, (x, y, self.power_bar_width, self.power_bar_height))
        pygame.draw.rect(screen, YELLOW, (x, y, self.power_bar_width * (self.optimal_zone_start / 100), self.power_bar_height))
        pygame.draw.rect(screen, GREEN, (
            x + self.power_bar_width * (self.optimal_zone_start / 100),
            y,
            self.power_bar_width * ((self.optimal_zone_end - self.optimal_zone_start) / 100),
            self.power_bar_height
        ))
        pygame.draw.rect(screen, RED, (
            x + self.power_bar_width * (self.optimal_zone_end / 100),
            y,
            self.power_bar_width * ((100 - self.optimal_zone_end) / 100),
            self.power_bar_height
        ))

        indicator_x = x + (self.power / 100) * self.power_bar_width
        pygame.draw.line(screen, WHITE, (indicator_x, y - 5), (indicator_x, y + self.power_bar_height + 5), 3)

        pygame.draw.rect(screen, WHITE, (x, y, self.power_bar_width, self.power_bar_height), 2)

        text = font.render(f"力量: {int(self.power)}%", True, WHITE)
        screen.blit(text, (x, y - 30))

    def draw_bobber(self, screen):
        if self.state in ["casting", "waiting", "bite"]:
            pygame.draw.circle(screen, RED, (int(self.bobber_x), int(self.bobber_y)), 8)
            pygame.draw.circle(screen, WHITE, (int(self.bobber_x), int(self.bobber_y)), 4)

    def draw_rod(self, screen, player_x, player_y):
        rod_length = 100
        angle_rad = math.radians(self.angle)
        end_x = player_x + rod_length * math.cos(angle_rad)
        end_y = player_y - rod_length * math.sin(angle_rad)

        pygame.draw.line(screen, BROWN, (player_x, player_y), (end_x, end_y), 8)
        pygame.draw.line(screen, (101, 67, 33), (player_x, player_y), (end_x, end_y), 4)

        if self.state in ["casting", "waiting", "bite"]:
            pygame.draw.line(screen, (200, 200, 200), (end_x, end_y), (self.bobber_x, self.bobber_y), 1)
