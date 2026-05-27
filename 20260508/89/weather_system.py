import random
from config import *

class Weather:
    SUNNY = 0
    CLOUDY = 1
    RAINY = 2
    STORMY = 3

    NAMES = ["晴天", "多云", "雨天", "暴风雨"]
    COLORS = [(135, 206, 235), (150, 150, 160), (80, 80, 120), (50, 50, 80)]
    BITE_BONUS = [0.0, 0.1, 0.25, -0.3]
    RARE_BONUS = [0.0, 0.05, 0.15, 0.3]

class WeatherSystem:
    def __init__(self):
        self.current_weather = Weather.SUNNY
        self.weather_timer = 0
        self.weather_duration = 600
        self.raindrops = []
        self.clouds = []
        self.init_clouds()

    def init_clouds(self):
        for _ in range(8):
            self.clouds.append({
                'x': random.randint(0, SCREEN_WIDTH),
                'y': random.randint(20, 150),
                'size': random.randint(40, 80),
                'speed': random.uniform(0.3, 1.0)
            })

    def change_weather(self):
        weights = [0.4, 0.3, 0.2, 0.1]
        r = random.random()
        cumulative = 0
        for i, w in enumerate(weights):
            cumulative += w
            if r <= cumulative:
                self.current_weather = i
                break
        self.weather_duration = random.randint(400, 800)
        self.weather_timer = 0

    def update(self):
        self.weather_timer += 1
        if self.weather_timer >= self.weather_duration:
            self.change_weather()

        for cloud in self.clouds:
            cloud['x'] += cloud['speed']
            if cloud['x'] > SCREEN_WIDTH + 100:
                cloud['x'] = -100
                cloud['y'] = random.randint(20, 150)

        if self.current_weather >= Weather.RAINY:
            if len(self.raindrops) < 200:
                for _ in range(3):
                    self.raindrops.append({
                        'x': random.randint(0, SCREEN_WIDTH),
                        'y': random.randint(0, WATER_TOP),
                        'speed': random.randint(8, 15)
                    })

            for drop in self.raindrops[:]:
                drop['y'] += drop['speed']
                if drop['y'] > WATER_TOP:
                    self.raindrops.remove(drop)

    def draw(self, screen):
        sky_color = Weather.COLORS[self.current_weather]
        pygame.draw.rect(screen, sky_color, (0, 0, SCREEN_WIDTH, WATER_TOP))

        for cloud in self.clouds:
            self.draw_cloud(screen, cloud['x'], cloud['y'], cloud['size'])

        if self.current_weather >= Weather.RAINY:
            for drop in self.raindrops:
                pygame.draw.line(screen, (100, 150, 200), (drop['x'], drop['y']), (drop['x'] - 2, drop['y'] + 10), 1)

    def draw_cloud(self, screen, x, y, size):
        alpha = 200 if self.current_weather == Weather.SUNNY else 180
        cloud_color = (255, 255, 255, alpha)
        s = pygame.Surface((size * 2, size), pygame.SRCALPHA)
        pygame.draw.circle(s, cloud_color, (size // 2, size // 2), size // 2)
        pygame.draw.circle(s, cloud_color, (size, size // 2), size // 2)
        pygame.draw.circle(s, cloud_color, (size * 3 // 2, size // 2), size // 2)
        pygame.draw.ellipse(s, cloud_color, (size // 3, size // 3, size * 1.5, size * 0.8))
        screen.blit(s, (x, y))

    def get_bite_probability_bonus(self):
        return Weather.BITE_BONUS[self.current_weather]

    def get_rare_fish_bonus(self):
        return Weather.RARE_BONUS[self.current_weather]

    def get_weather_name(self):
        return Weather.NAMES[self.current_weather]
