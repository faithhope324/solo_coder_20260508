import pygame
from config import (TILE_SIZE, BOMB_TIMER_MS, EXPLOSION_DURATION_MS,
                    BOMB_RADIUS_DEFAULT, COLOR_BOMB, COLOR_EXPLOSION)
from collision import is_solid_cell, explode_cell, in_bounds


class Bomb:
    def __init__(self, cx, cy, radius=BOMB_RADIUS_DEFAULT, owner=None):
        self.cx = cx
        self.cy = cy
        self.radius = radius
        self.owner = owner
        self.timer = BOMB_TIMER_MS
        self.exploded = False
        self.explosion_timer = 0
        self.affected_cells = set()
        self.destroyed_powerups = []

    def update(self, dt, grid, powerups):
        if not self.exploded:
            self.timer -= dt
            if self.timer <= 0:
                self.explode(grid, powerups)
        else:
            self.explosion_timer -= dt

    def explode(self, grid, powerups):
        self.exploded = True
        self.explosion_timer = EXPLOSION_DURATION_MS
        cells = set()
        cells.add((self.cx, self.cy))

        directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        for dx, dy in directions:
            for step in range(1, self.radius + 1):
                nx = self.cx + dx * step
                ny = self.cy + dy * step
                if not in_bounds(nx, ny):
                    break
                tile = grid[ny][nx]
                if tile == 1:
                    break
                cells.add((nx, ny))
                if tile == 2:
                    break

        for cx, cy in cells:
            explode_cell(grid, cx, cy)

        if powerups is not None:
            remaining = []
            for p in powerups:
                if (p.cx, p.cy) in cells:
                    self.destroyed_powerups.append(p)
                else:
                    remaining.append(p)
            powerups[:] = remaining

        self.affected_cells = cells

        if self.owner is not None:
            self.owner.bomb_exploded(self)

    def is_active(self):
        return (not self.exploded) or self.explosion_timer > 0

    def draw(self, surface):
        if not self.exploded:
            rect = pygame.Rect(self.cx * TILE_SIZE + 4,
                               self.cy * TILE_SIZE + 4,
                               TILE_SIZE - 8, TILE_SIZE - 8)
            pygame.draw.circle(surface, COLOR_BOMB, rect.center,
                               rect.width // 2)
            cx = rect.centerx
            cy = rect.centery - rect.height // 2 + 3
            pygame.draw.circle(surface, (255, 80, 0), (cx, cy), 3)
        else:
            for cx, cy in self.affected_cells:
                rect = pygame.Rect(cx * TILE_SIZE, cy * TILE_SIZE,
                                   TILE_SIZE, TILE_SIZE)
                pygame.draw.rect(surface, COLOR_EXPLOSION, rect, border_radius=4)


def compute_explosion_cells(bombs):
    cells = set()
    for b in bombs:
        if b.exploded and b.explosion_timer > 0:
            cells.update(b.affected_cells)
    return cells
