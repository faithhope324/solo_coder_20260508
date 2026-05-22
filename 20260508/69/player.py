import pygame

class Player:
    def __init__(self, x, y, width, height):
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.speed = 5
        self.max_speed = 8
        self.color = (255, 69, 0)
        self.rect = pygame.Rect(x, y, width, height)
        self.fuel = 100
        self.max_fuel = 100
        self.invincible = False
        self.invincible_timer = 0

    def move(self, keys, screen_width, road_left, road_right):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x += self.speed
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            self.y -= self.speed * 0.5
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            self.y += self.speed * 0.5

        self.x = max(road_left, min(self.x, road_right - self.width))
        self.y = max(0, min(self.y, 600 - self.height))
        self.rect.x = self.x
        self.rect.y = self.y

    def update(self, dt):
        self.fuel -= 0.02 * dt / 16
        if self.fuel <= 0:
            self.fuel = 0

        if self.invincible:
            self.invincible_timer -= dt
            if self.invincible_timer <= 0:
                self.invincible = False

    def draw(self, screen):
        if self.invincible and pygame.time.get_ticks() % 200 < 100:
            return
        
        pygame.draw.rect(screen, self.color, self.rect, border_radius=5)
        
        window_color = (135, 206, 235)
        pygame.draw.rect(screen, window_color, 
                        (self.x + 5, self.y + 5, self.width - 10, self.height // 3), 
                        border_radius=3)
        
        wheel_color = (30, 30, 30)
        wheel_width = 6
        wheel_height = 10
        pygame.draw.rect(screen, wheel_color, (self.x - 2, self.y + 5, wheel_width, wheel_height))
        pygame.draw.rect(screen, wheel_color, (self.x + self.width - wheel_width + 2, self.y + 5, wheel_width, wheel_height))
        pygame.draw.rect(screen, wheel_color, (self.x - 2, self.y + self.height - wheel_height - 5, wheel_width, wheel_height))
        pygame.draw.rect(screen, wheel_color, (self.x + self.width - wheel_width + 2, self.y + self.height - wheel_height - 5, wheel_width, wheel_height))

        headlight_color = (255, 255, 200)
        pygame.draw.rect(screen, headlight_color, (self.x + 5, self.y - 2, 8, 4))
        pygame.draw.rect(screen, headlight_color, (self.x + self.width - 13, self.y - 2, 8, 4))

    def add_fuel(self, amount):
        self.fuel = min(self.fuel + amount, self.max_fuel)

    def set_invincible(self, duration):
        self.invincible = True
        self.invincible_timer = duration

    def get_rect(self):
        return self.rect
