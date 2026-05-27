import random
import pygame

COIN_SIZE = 30
BOMB_SIZE = 32
BASE_FALL_SPEED = 3
COIN_SPAWN_INTERVAL = 1000
BOMB_SPAWN_INTERVAL = 2500

COIN_COLOR = (255, 215, 0)
BOMB_COLOR = (50, 50, 50)


class FallingObject:
    def __init__(self, x, y, obj_type):
        self.type = obj_type
        self.y = float(y)
        if obj_type == "coin":
            self.rect = pygame.Rect(x, y, COIN_SIZE, COIN_SIZE)
            self.color = COIN_COLOR
        else:
            self.rect = pygame.Rect(x, y, BOMB_SIZE, BOMB_SIZE)
            self.color = BOMB_COLOR
        self.speed = BASE_FALL_SPEED

    def update(self, speed_multiplier):
        self.y += self.speed * speed_multiplier
        self.rect.y = int(self.y)

    def draw(self, screen):
        if self.type == "coin":
            pygame.draw.circle(
                screen,
                self.color,
                (self.rect.centerx, self.rect.centery),
                self.rect.width // 2,
            )
            pygame.draw.circle(
                screen,
                (200, 170, 0),
                (self.rect.centerx, self.rect.centery),
                self.rect.width // 2,
                3,
            )
            font = pygame.font.SysFont(None, 20)
            text = font.render("$", True, (139, 90, 0))
            text_rect = text.get_rect(center=self.rect.center)
            screen.blit(text, text_rect)
        else:
            pygame.draw.circle(
                screen,
                self.color,
                (self.rect.centerx, self.rect.centery),
                self.rect.width // 2,
            )
            pygame.draw.circle(
                screen,
                (80, 80, 80),
                (self.rect.centerx, self.rect.centery),
                self.rect.width // 2,
                3,
            )
            pygame.draw.line(
                screen,
                (100, 100, 100),
                (self.rect.centerx, self.rect.top),
                (self.rect.centerx + 5, self.rect.top - 8),
                3,
            )


class Generator:
    def __init__(self, screen_width):
        self.screen_width = screen_width
        self.objects = []
        self.last_coin_time = 0
        self.last_bomb_time = 0

    def spawn_coin(self, current_time, spawn_multiplier=1.0):
        interval = int(COIN_SPAWN_INTERVAL * spawn_multiplier)
        if current_time - self.last_coin_time >= interval:
            x = random.randint(0, self.screen_width - COIN_SIZE)
            self.objects.append(FallingObject(x, -COIN_SIZE, "coin"))
            self.last_coin_time = current_time

    def spawn_bomb(self, current_time, spawn_multiplier=1.0):
        interval = int(BOMB_SPAWN_INTERVAL * spawn_multiplier)
        if current_time - self.last_bomb_time >= interval:
            x = random.randint(0, self.screen_width - BOMB_SIZE)
            self.objects.append(FallingObject(x, -BOMB_SIZE, "bomb"))
            self.last_bomb_time = current_time

    def update_all(self, speed_multiplier):
        for obj in self.objects:
            obj.update(speed_multiplier)

    def draw_all(self, screen):
        for obj in self.objects:
            obj.draw(screen)

    def remove_out_of_screen(self, screen_height):
        self.objects = [
            obj for obj in self.objects if obj.rect.top <= screen_height
        ]

    def remove_object(self, obj):
        if obj in self.objects:
            self.objects.remove(obj)

    def reset(self):
        self.objects.clear()
        self.last_coin_time = 0
        self.last_bomb_time = 0
