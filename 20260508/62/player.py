import pygame
from config import (TILE_SIZE, PLAYER_SPEED, COLOR_PLAYER,
                    BOMB_RADIUS_DEFAULT)
from collision import move_entity, cell_for_pos


class Player:
    def __init__(self, cx, cy):
        self.size = int(TILE_SIZE * 0.8)
        offset = (TILE_SIZE - self.size) // 2
        self.x = cx * TILE_SIZE + offset
        self.y = cy * TILE_SIZE + offset
        self.speed = PLAYER_SPEED
        self.max_bombs = 1
        self.active_bombs = 0
        self.radius = BOMB_RADIUS_DEFAULT
        self.pass_wall = False
        self.alive = True
        self.last_pickup = None

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.size, self.size)

    def cell(self):
        cx = (self.x + self.size / 2) // TILE_SIZE
        cy = (self.y + self.size / 2) // TILE_SIZE
        return int(cx), int(cy)

    def update(self, keys, grid, bombs, bindings):
        if not self.alive:
            return
        dx = 0
        dy = 0
        if keys.get(bindings['left']):
            dx -= self.speed
        if keys.get(bindings['right']):
            dx += self.speed
        if keys.get(bindings['up']):
            dy -= self.speed
        if keys.get(bindings['down']):
            dy += self.speed
        if dx and dy:
            s = (2 ** 0.5) / 2
            dx *= s
            dy *= s
        move_entity(grid, self, dx, dy, bombs=bombs)

    def can_place_bomb(self, bombs):
        if self.active_bombs >= self.max_bombs:
            return False
        cx, cy = self.cell()
        for b in bombs:
            if not b.exploded and b.cx == cx and b.cy == cy:
                return False
        return True

    def bomb_exploded(self, bomb):
        if self.active_bombs > 0:
            self.active_bombs -= 1

    def apply_powerup(self, ptype):
        self.last_pickup = ptype
        if ptype == 'bomb':
            self.max_bombs += 1
        elif ptype == 'speed':
            self.speed = min(self.speed + 0.4, 5.0)
        elif ptype == 'wall':
            self.pass_wall = True
        elif ptype == 'radius':
            self.radius += 1

    def draw(self, surface):
        if not self.alive:
            return
        r = self.rect
        pygame.draw.rect(surface, COLOR_PLAYER, r, border_radius=6)
        pygame.draw.rect(surface, (255, 255, 255),
                         r.inflate(-8, -8), 2, border_radius=6)
