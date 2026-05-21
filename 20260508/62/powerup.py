import random
import pygame
from config import (TILE_SIZE, POWERUP_DROP_CHANCE, POWERUP_TYPES,
                    POWERUP_COLORS, POWERUP_NAMES)
from font_utils import get_font


class PowerUp:
    def __init__(self, cx, cy, ptype):
        self.cx = cx
        self.cy = cy
        self.type = ptype

    def draw(self, surface):
        rect = pygame.Rect(self.cx * TILE_SIZE + 6,
                           self.cy * TILE_SIZE + 6,
                           TILE_SIZE - 12, TILE_SIZE - 12)
        color = POWERUP_COLORS.get(self.type, (255, 255, 255))
        pygame.draw.rect(surface, color, rect, border_radius=6)
        pygame.draw.rect(surface, (0, 0, 0), rect, 2, border_radius=6)
        font = get_font(14, bold=True)
        text = font.render({'bomb': 'B', 'speed': 'S',
                            'wall': 'W', 'radius': 'R'}.get(self.type, '?'),
                           True, (0, 0, 0))
        surface.blit(text, text.get_rect(center=rect.center))


def maybe_drop_powerup(cx, cy):
    if random.random() < POWERUP_DROP_CHANCE:
        ptype = random.choice(POWERUP_TYPES)
        return PowerUp(cx, cy, ptype)
    return None


def draw_powerups(powerups, surface):
    for p in powerups:
        p.draw(surface)
