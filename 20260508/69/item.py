import pygame
import random

class Item:
    def __init__(self, x, y, item_type):
        self.x = x
        self.y = y
        self.width = 30
        self.height = 30
        self.type = item_type
        self.speed = 2
        self.rect = pygame.Rect(x, y, self.width, self.height)
        self.bob_offset = 0
        self.bob_speed = 0.005

    def update(self, dt, speed_multiplier):
        self.y += self.speed * speed_multiplier * dt / 16
        self.rect.y = self.y
        self.bob_offset += self.bob_speed * dt

    def draw(self, screen):
        bob_y = self.y + int(pygame.math.sin(self.bob_offset) * 3)
        
        if self.type == 'fuel':
            pygame.draw.rect(screen, (255, 215, 0), (self.x, bob_y, self.width, self.height), border_radius=5)
            pygame.draw.rect(screen, (255, 165, 0), (self.x + 5, bob_y + 5, self.width - 10, self.height - 10), border_radius=3)
            font = pygame.font.Font(None, 20)
            text = font.render('F', True, (0, 0, 0))
            screen.blit(text, (self.x + 10, bob_y + 7))
        
        elif self.type == 'speed':
            pygame.draw.rect(screen, (0, 255, 255), (self.x, bob_y, self.width, self.height), border_radius=5)
            pygame.draw.polygon(screen, (255, 255, 255), [
                (self.x + 8, bob_y + 5),
                (self.x + 22, bob_y + 15),
                (self.x + 8, bob_y + 25)
            ])
        
        elif self.type == 'shield':
            pygame.draw.rect(screen, (148, 0, 211), (self.x, bob_y, self.width, self.height), border_radius=5)
            pygame.draw.circle(screen, (255, 255, 255), (self.x + 15, bob_y + 15), 10, 2)
            pygame.draw.circle(screen, (255, 255, 255), (self.x + 15, bob_y + 15), 5)

    def is_off_screen(self, screen_height):
        return self.y > screen_height

    def get_rect(self):
        return self.rect

    def get_type(self):
        return self.type


class ItemSystem:
    def __init__(self, road_left, road_right, screen_width, screen_height):
        self.road_left = road_left
        self.road_right = road_right
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.items = []
        self.spawn_timer = 0
        self.spawn_interval = 3000
        self.item_types = ['fuel', 'fuel', 'fuel', 'speed', 'shield']
        self.lanes = 3

    def get_lane_x(self, lane):
        lane_width = (self.road_right - self.road_left) // self.lanes
        return self.road_left + lane * lane_width + (lane_width - 30) // 2

    def spawn(self, speed_multiplier):
        lane = random.randint(0, self.lanes - 1)
        x = self.get_lane_x(lane)
        y = -40
        item_type = random.choice(self.item_types)
        
        for item in self.items:
            if abs(item.y - y) < 80 and abs(item.x - x) < 40:
                return
        
        self.items.append(Item(x, y, item_type))

    def update(self, dt, speed_multiplier):
        self.spawn_timer += dt
        adjusted_interval = max(self.spawn_interval / speed_multiplier, 1500)
        
        if self.spawn_timer >= adjusted_interval:
            self.spawn(speed_multiplier)
            self.spawn_timer = 0

        for item in self.items:
            item.update(dt, speed_multiplier)

        self.items = [item for item in self.items if not item.is_off_screen(self.screen_height)]

    def draw(self, screen):
        for item in self.items:
            item.draw(screen)

    def check_collision(self, player_rect):
        collected = []
        for item in self.items:
            if player_rect.colliderect(item.get_rect()):
                collected.append(item)
        
        for item in collected:
            self.items.remove(item)
        
        return collected

    def reset(self):
        self.items = []
        self.spawn_timer = 0
