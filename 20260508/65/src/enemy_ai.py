import pygame
import random
import time
from typing import List, Tuple, Optional
from src.constants import (
    TILE_SIZE, ENEMY_SPEED, ENEMY_CHANGE_DIR_TIME,
    DIRECTIONS, COLORS, TILE_TYPES
)


class Enemy:
    def __init__(self, enemy_type: str, spawn_x: int, spawn_y: int, speed: int = None):
        self.enemy_type = enemy_type
        self.x = spawn_x * TILE_SIZE + TILE_SIZE // 2
        self.y = spawn_y * TILE_SIZE + TILE_SIZE // 2
        self.grid_x = spawn_x
        self.grid_y = spawn_y
        self.alive = True
        self.size = TILE_SIZE - 12

        if enemy_type == 'normal':
            self.speed = speed if speed else ENEMY_SPEED
            self.direction = random.choice(list(DIRECTIONS.keys()))
            self.last_dir_change = pygame.time.get_ticks()
            self.change_dir_time = ENEMY_CHANGE_DIR_TIME
            self.color = COLORS['enemy_normal']
        else:
            self.speed = 0
            self.direction = 'DOWN'
            self.color = COLORS['enemy_static']

        self.target_x = self.x
        self.target_y = self.y
        self.is_moving = False

    def update(self, map_loader, bubbles, delta_time: float):
        if not self.alive:
            return

        if self.enemy_type == 'normal':
            self._update_normal(map_loader, bubbles, delta_time)

        self.grid_x = int(self.x // TILE_SIZE)
        self.grid_y = int(self.y // TILE_SIZE)

    def _update_normal(self, map_loader, bubbles, delta_time: float):
        current_time = pygame.time.get_ticks()

        if current_time - self.last_dir_change > self.change_dir_time:
            self._change_direction(map_loader)
            self.last_dir_change = current_time

        dx, dy = DIRECTIONS[self.direction]
        dx *= self.speed
        dy *= self.speed

        if dx != 0:
            new_x = self.x + dx
            if self._can_move_to(new_x, self.y, map_loader, bubbles):
                self.x = new_x
            else:
                self._change_direction(map_loader)
                self.last_dir_change = current_time

        if dy != 0:
            new_y = self.y + dy
            if self._can_move_to(self.x, new_y, map_loader, bubbles):
                self.y = new_y
            else:
                self._change_direction(map_loader)
                self.last_dir_change = current_time

    def _can_move_to(self, x: int, y: int, map_loader, bubbles) -> bool:
        half_size = self.size // 2
        corners = [
            (x - half_size, y - half_size),
            (x + half_size, y - half_size),
            (x - half_size, y + half_size),
            (x + half_size, y + half_size),
        ]

        for corner_x, corner_y in corners:
            grid_x = int(corner_x // TILE_SIZE)
            grid_y = int(corner_y // TILE_SIZE)

            if not map_loader.is_walkable(grid_x, grid_y):
                return False

            for bubble in bubbles:
                if bubble.grid_x == grid_x and bubble.grid_y == grid_y:
                    return False

        return True

    def _change_direction(self, map_loader):
        directions = list(DIRECTIONS.keys())
        random.shuffle(directions)

        for direction in directions:
            dx, dy = DIRECTIONS[direction]
            check_x = self.grid_x + dx
            check_y = self.grid_y + dy

            if map_loader.is_walkable(check_x, check_y):
                self.direction = direction
                return

        self.direction = random.choice(directions)

    def draw(self, screen):
        if not self.alive:
            return

        rect = pygame.Rect(
            self.x - self.size // 2,
            self.y - self.size // 2,
            self.size,
            self.size
        )

        if self.enemy_type == 'normal':
            pygame.draw.ellipse(screen, self.color, rect)
            pygame.draw.ellipse(screen, (0, 0, 0), rect, 2)

            eye_offset = 5
            eye_y = self.y - 4
            pygame.draw.circle(screen, (255, 255, 255), (self.x - eye_offset, eye_y), 4)
            pygame.draw.circle(screen, (255, 255, 255), (self.x + eye_offset, eye_y), 4)
            pygame.draw.circle(screen, (0, 0, 0), (self.x - eye_offset, eye_y), 2)
            pygame.draw.circle(screen, (0, 0, 0), (self.x + eye_offset, eye_y), 2)

            mouth_rect = pygame.Rect(self.x - 6, self.y + 4, 12, 4)
            pygame.draw.rect(screen, (0, 0, 0), mouth_rect)
        else:
            pygame.draw.polygon(screen, self.color, [
                (self.x, self.y - self.size // 2),
                (self.x - self.size // 2, self.y + self.size // 2),
                (self.x + self.size // 2, self.y + self.size // 2)
            ])
            pygame.draw.polygon(screen, (0, 0, 0), [
                (self.x, self.y - self.size // 2),
                (self.x - self.size // 2, self.y + self.size // 2),
                (self.x + self.size // 2, self.y + self.size // 2)
            ], 2)

            eye_offset = 4
            eye_y = self.y
            pygame.draw.circle(screen, (255, 255, 255), (self.x - eye_offset, eye_y), 3)
            pygame.draw.circle(screen, (255, 255, 255), (self.x + eye_offset, eye_y), 3)
            pygame.draw.circle(screen, (0, 0, 0), (self.x - eye_offset, eye_y), 1)
            pygame.draw.circle(screen, (0, 0, 0), (self.x + eye_offset, eye_y), 1)

    def get_grid_position(self) -> Tuple[int, int]:
        return (self.grid_x, self.grid_y)

    def die(self):
        self.alive = False

    def check_player_collision(self, players) -> bool:
        if not self.alive:
            return False

        for player in players:
            if not player.alive:
                continue

            dx = self.x - player.x
            dy = self.y - player.y
            distance = (dx ** 2 + dy ** 2) ** 0.5

            if distance < (self.size + player.size) // 2 - 4:
                return True

        return False


class EnemyAIController:
    def __init__(self, enemy_data: List[dict] = None):
        self.enemies: List[Enemy] = []
        if enemy_data:
            self.load_enemies(enemy_data)

    def load_enemies(self, enemy_data: List[dict]):
        self.enemies = []
        for data in enemy_data:
            enemy = Enemy(
                enemy_type=data['type'],
                spawn_x=data['x'],
                spawn_y=data['y'],
                speed=data.get('speed', None)
            )
            self.enemies.append(enemy)

    def update(self, map_loader, bubbles, delta_time: float):
        for enemy in self.enemies:
            enemy.update(map_loader, bubbles, delta_time)

    def draw(self, screen):
        for enemy in self.enemies:
            enemy.draw(screen)

    def get_alive_enemies(self) -> List[Enemy]:
        return [e for e in self.enemies if e.alive]

    def check_collision_with_explosion(self, explosion_cells: List[Tuple[int, int]]) -> List[Enemy]:
        killed_enemies = []
        for enemy in self.enemies:
            if enemy.alive and enemy.get_grid_position() in explosion_cells:
                enemy.die()
                killed_enemies.append(enemy)
        return killed_enemies

    def check_player_collisions(self, players) -> List:
        killed_players = []
        for enemy in self.enemies:
            if enemy.check_player_collision(players):
                for player in players:
                    if player.alive:
                        dx = enemy.x - player.x
                        dy = enemy.y - player.y
                        distance = (dx ** 2 + dy ** 2) ** 0.5
                        if distance < (enemy.size + player.size) // 2 - 4:
                            player.die()
                            killed_players.append(player)
        return killed_players

    def all_enemies_dead(self) -> bool:
        return len(self.get_alive_enemies()) == 0

    def reset(self, enemy_data: List[dict] = None):
        self.enemies = []
        if enemy_data:
            self.load_enemies(enemy_data)
