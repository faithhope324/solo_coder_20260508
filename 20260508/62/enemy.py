import random
import pygame
from config import TILE_SIZE, ENEMY_SPEED, COLOR_ENEMY
from collision import move_entity, can_enter, cell_for_pos


class Enemy:
    def __init__(self, cx, cy):
        self.size = int(TILE_SIZE * 0.8)
        offset = (TILE_SIZE - self.size) // 2
        self.x = cx * TILE_SIZE + offset
        self.y = cy * TILE_SIZE + offset
        self.speed = ENEMY_SPEED
        self.dir = random.choice([(1, 0), (-1, 0), (0, 1), (0, -1)])
        self.alive = True
        self.pass_wall = False
        self.change_timer = 0

    @property
    def rect(self):
        return pygame.Rect(int(self.x), int(self.y), self.size, self.size)

    def cell(self):
        cx = (self.x + self.size / 2) // TILE_SIZE
        cy = (self.y + self.size / 2) // TILE_SIZE
        return int(cx), int(cy)

    def update(self, grid, player, bombs):
        if not self.alive:
            return

        self.change_timer -= 1
        if self.change_timer <= 0 or not self._can_go(grid, self.dir, bombs):
            self._choose_direction(grid, player, bombs)

        dx = self.dir[0] * self.speed
        dy = self.dir[1] * self.speed
        if dx != 0:
            move_entity(grid, self, dx, 0, bombs=bombs)
        if dy != 0:
            move_entity(grid, self, 0, dy, bombs=bombs)

    def _can_go(self, grid, direction, bombs):
        cx, cy = self.cell()
        nx, ny = cx + direction[0], cy + direction[1]
        return can_enter(grid, nx, ny, pass_wall=False, bombs=bombs)

    def _choose_direction(self, grid, player, bombs):
        options = [(1, 0), (-1, 0), (0, 1), (0, -1)]
        valid = [d for d in options if self._can_go(grid, d, bombs)]
        if not valid:
            self.change_timer = 20
            return

        px, py = player.cell() if player else (0, 0)
        cx, cy = self.cell()
        towards = []
        if px > cx and (1, 0) in valid:
            towards.append((1, 0))
        if px < cx and (-1, 0) in valid:
            towards.append((-1, 0))
        if py > cy and (0, 1) in valid:
            towards.append((0, 1))
        if py < cy and (0, -1) in valid:
            towards.append((0, -1))

        if towards and random.random() < 0.65:
            self.dir = random.choice(towards)
        else:
            choices = [d for d in valid if d != (-self.dir[0], -self.dir[1])]
            if not choices:
                choices = valid
            self.dir = random.choice(choices)
        self.change_timer = random.randint(15, 40)

    def draw(self, surface):
        if not self.alive:
            return
        r = self.rect
        pygame.draw.rect(surface, COLOR_ENEMY, r, border_radius=8)
        pygame.draw.circle(surface, (255, 255, 255),
                           (r.centerx - 5, r.centery - 3), 3)
        pygame.draw.circle(surface, (255, 255, 255),
                           (r.centerx + 5, r.centery - 3), 3)
        pygame.draw.circle(surface, (0, 0, 0),
                           (r.centerx - 5, r.centery - 3), 1)
        pygame.draw.circle(surface, (0, 0, 0),
                           (r.centerx + 5, r.centery - 3), 1)
