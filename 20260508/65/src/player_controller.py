import pygame
from typing import List, Tuple, Optional
from src.constants import (
    TILE_SIZE, PLAYER_SPEED, P1_CONTROLS, P2_CONTROLS,
    DIRECTIONS, DEFAULT_BOMB_RANGE, DEFAULT_MAX_BUBBLES
)


class Player:
    def __init__(self, player_id: int, spawn_x: int, spawn_y: int, controls: dict, color: tuple):
        self.player_id = player_id
        self.x = spawn_x * TILE_SIZE + TILE_SIZE // 2
        self.y = spawn_y * TILE_SIZE + TILE_SIZE // 2
        self.grid_x = spawn_x
        self.grid_y = spawn_y
        self.controls = controls
        self.color = color
        self.speed = PLAYER_SPEED
        self.direction = 'DOWN'
        self.is_moving = False
        self.alive = True

        self.max_bubbles = DEFAULT_MAX_BUBBLES
        self.bomb_range = DEFAULT_BOMB_RANGE
        self.active_bubbles = 0

        self.size = TILE_SIZE - 8
        self.bomb_key_pressed = False

    def update(self, keys, map_loader, bubbles, delta_time: float):
        if not self.alive:
            return

        dx = 0
        dy = 0

        if keys[self.controls['UP']]:
            dy = -self.speed
            self.direction = 'UP'
            self.is_moving = True
        elif keys[self.controls['DOWN']]:
            dy = self.speed
            self.direction = 'DOWN'
            self.is_moving = True
        elif keys[self.controls['LEFT']]:
            dx = -self.speed
            self.direction = 'LEFT'
            self.is_moving = True
        elif keys[self.controls['RIGHT']]:
            dx = self.speed
            self.direction = 'RIGHT'
            self.is_moving = True
        else:
            self.is_moving = False

        if dx != 0:
            new_x = self.x + dx
            if self._can_move_to(new_x, self.y, map_loader, bubbles):
                self.x = new_x

        if dy != 0:
            new_y = self.y + dy
            if self._can_move_to(self.x, new_y, map_loader, bubbles):
                self.y = new_y

        self.grid_x = int(self.x // TILE_SIZE)
        self.grid_y = int(self.y // TILE_SIZE)

        if keys[self.controls['BOMB']]:
            if not self.bomb_key_pressed and self.active_bubbles < self.max_bubbles:
                self.bomb_key_pressed = True
                return self._place_bomb()
        else:
            self.bomb_key_pressed = False

        return None

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
                    if not bubble.can_pass(self):
                        return False

        return True

    def _place_bomb(self):
        return {
            'grid_x': self.grid_x,
            'grid_y': self.grid_y,
            'owner': self,
            'range': self.bomb_range
        }

    def draw(self, screen):
        if not self.alive:
            return

        rect = pygame.Rect(
            self.x - self.size // 2,
            self.y - self.size // 2,
            self.size,
            self.size
        )
        pygame.draw.rect(screen, self.color, rect, border_radius=8)
        pygame.draw.rect(screen, (0, 0, 0), rect, 2, border_radius=8)

        eye_offset = 6
        eye_size = 4
        if self.direction == 'UP':
            left_eye = (self.x - eye_offset, self.y - eye_offset)
            right_eye = (self.x + eye_offset, self.y - eye_offset)
        elif self.direction == 'DOWN':
            left_eye = (self.x - eye_offset, self.y + 2)
            right_eye = (self.x + eye_offset, self.y + 2)
        elif self.direction == 'LEFT':
            left_eye = (self.x - eye_offset - 4, self.y - 2)
            right_eye = (self.x - eye_offset + 4, self.y - 2)
        else:
            left_eye = (self.x + eye_offset - 4, self.y - 2)
            right_eye = (self.x + eye_offset + 4, self.y - 2)

        pygame.draw.circle(screen, (255, 255, 255), left_eye, eye_size)
        pygame.draw.circle(screen, (255, 255, 255), right_eye, eye_size)
        pygame.draw.circle(screen, (0, 0, 0), left_eye, 2)
        pygame.draw.circle(screen, (0, 0, 0), right_eye, 2)

        font = pygame.font.Font(None, 20)
        text = font.render(f"P{self.player_id}", True, (255, 255, 255))
        text_rect = text.get_rect(center=(self.x, self.y - self.size // 2 - 8))
        screen.blit(text, text_rect)

    def get_grid_position(self) -> Tuple[int, int]:
        return (self.grid_x, self.grid_y)

    def die(self):
        self.alive = False

    def increase_bomb_range(self):
        self.bomb_range += 1

    def increase_max_bubbles(self):
        self.max_bubbles += 1


class PlayerController:
    def __init__(self, num_players: int = 1, spawn_points: List[Tuple[int, int]] = None):
        self.players: List[Player] = []
        self.num_players = num_players

        if spawn_points is None:
            spawn_points = [(1, 1), (13, 11)]

        colors = [(0, 191, 255), (255, 99, 71)]
        controls_list = [P1_CONTROLS, P2_CONTROLS]

        for i in range(min(num_players, len(spawn_points))):
            spawn_x, spawn_y = spawn_points[i] if i < len(spawn_points) else (1, 1)
            player = Player(
                player_id=i + 1,
                spawn_x=spawn_x,
                spawn_y=spawn_y,
                controls=controls_list[i],
                color=colors[i]
            )
            self.players.append(player)

    def update(self, keys, map_loader, bubbles, delta_time: float) -> List[dict]:
        new_bombs = []
        for player in self.players:
            bomb = player.update(keys, map_loader, bubbles, delta_time)
            if bomb:
                new_bombs.append(bomb)
        return new_bombs

    def draw(self, screen):
        for player in self.players:
            player.draw(screen)

    def get_alive_players(self) -> List[Player]:
        return [p for p in self.players if p.alive]

    def is_game_over(self) -> bool:
        return len(self.get_alive_players()) == 0

    def check_collision_with_explosion(self, explosion_cells: List[Tuple[int, int]]) -> List[Player]:
        killed_players = []
        for player in self.players:
            if player.alive and player.get_grid_position() in explosion_cells:
                player.die()
                killed_players.append(player)
        return killed_players

    def get_player(self, player_id: int) -> Optional[Player]:
        for player in self.players:
            if player.player_id == player_id:
                return player
        return None

    def reset(self, spawn_points: List[Tuple[int, int]] = None):
        if spawn_points is None:
            spawn_points = [(1, 1), (13, 11)]

        for i, player in enumerate(self.players):
            spawn_x, spawn_y = spawn_points[i] if i < len(spawn_points) else (1, 1)
            player.x = spawn_x * TILE_SIZE + TILE_SIZE // 2
            player.y = spawn_y * TILE_SIZE + TILE_SIZE // 2
            player.grid_x = spawn_x
            player.grid_y = spawn_y
            player.alive = True
            player.active_bubbles = 0
            player.max_bubbles = DEFAULT_MAX_BUBBLES
            player.bomb_range = DEFAULT_BOMB_RANGE
            player.direction = 'DOWN'
