import pygame
from typing import List, Tuple, Set, Optional
from src.constants import (
    TILE_SIZE, BUBBLE_TIME, EXPLOSION_TIME,
    DIRECTIONS, COLORS, TILE_TYPES
)


class Bubble:
    def __init__(self, grid_x: int, grid_y: int, owner, bomb_range: int):
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.owner = owner
        self.range = bomb_range
        self.place_time = pygame.time.get_ticks()
        self.explode_time = BUBBLE_TIME
        self.size = TILE_SIZE - 8
        self.is_exploding = False
        self.has_exploded = False
        self.can_pass_owner = True
        self.owner_left = False

        if owner:
            owner.active_bubbles += 1

    def update(self, current_time: int) -> bool:
        if self.has_exploded:
            return False

        if not self.owner_left and self.owner:
            if (self.owner.grid_x != self.grid_x or self.owner.grid_y != self.grid_y):
                self.owner_left = True
                self.can_pass_owner = False

        if current_time - self.place_time >= self.explode_time:
            self.is_exploding = True
            return True

        return False

    def can_pass(self, player) -> bool:
        if self.owner and player.player_id == self.owner.player_id:
            return self.can_pass_owner
        return False

    def draw(self, screen):
        if self.has_exploded:
            return

        x = self.grid_x * TILE_SIZE + TILE_SIZE // 2
        y = self.grid_y * TILE_SIZE + TILE_SIZE // 2

        current_time = pygame.time.get_ticks()
        elapsed = current_time - self.place_time
        pulse = 1 + 0.1 * pygame.math.sin(elapsed * 0.01)
        size = int(self.size * pulse)

        rect = pygame.Rect(x - size // 2, y - size // 2, size, size)
        pygame.draw.ellipse(screen, COLORS['bubble'], rect)
        pygame.draw.ellipse(screen, (255, 255, 255), rect, 2)

        highlight_rect = pygame.Rect(x - size // 4, y - size // 4, size // 3, size // 3)
        pygame.draw.ellipse(screen, (200, 255, 255), highlight_rect)

        time_left = max(0, (self.explode_time - elapsed) / 1000)
        font = pygame.font.Font(None, 16)
        text = font.render(f"{time_left:.1f}", True, (0, 0, 0))
        text_rect = text.get_rect(center=(x, y))
        screen.blit(text, text_rect)

    def explode(self, all_bubbles, map_loader) -> 'Explosion':
        if self.has_exploded:
            return None

        self.has_exploded = True
        if self.owner:
            self.owner.active_bubbles -= 1

        explosion_cells = self._calculate_explosion_cells(map_loader, all_bubbles)
        return Explosion(self.grid_x, self.grid_y, explosion_cells)

    def _calculate_explosion_cells(self, map_loader, all_bubbles) -> Set[Tuple[int, int]]:
        cells = set()
        cells.add((self.grid_x, self.grid_y))

        for direction_name, (dx, dy) in DIRECTIONS.items():
            for i in range(1, self.range + 1):
                check_x = self.grid_x + dx * i
                check_y = self.grid_y + dy * i

                if check_y < 0 or check_y >= len(map_loader.tile_map):
                    break
                if check_x < 0 or check_x >= len(map_loader.tile_map[0]):
                    break

                tile = map_loader.tile_map[check_y][check_x]

                if tile == TILE_TYPES['WALL']:
                    break

                if tile == TILE_TYPES['BOX']:
                    cells.add((check_x, check_y))
                    break

                for bubble in all_bubbles:
                    if (bubble.grid_x == check_x and bubble.grid_y == check_y
                            and not bubble.has_exploded and not bubble.is_exploding):
                        bubble.explode_time = 0
                        bubble.is_exploding = True

                cells.add((check_x, check_y))

        return cells


class Explosion:
    def __init__(self, center_x: int, center_y: int, cells: Set[Tuple[int, int]]):
        self.center_x = center_x
        self.center_y = center_y
        self.cells = cells
        self.start_time = pygame.time.get_ticks()
        self.duration = EXPLOSION_TIME
        self.active = True

    def update(self, current_time: int, map_loader) -> bool:
        if not self.active:
            return False

        if current_time - self.start_time >= self.duration:
            self.active = False
            return False

        self._destroy_tiles(map_loader)
        return True

    def _destroy_tiles(self, map_loader):
        for x, y in self.cells:
            if map_loader.is_destructible(x, y):
                map_loader.destroy_tile(x, y)

    def draw(self, screen):
        if not self.active:
            return

        current_time = pygame.time.get_ticks()
        elapsed = current_time - self.start_time
        progress = elapsed / self.duration

        alpha = int(255 * (1 - progress))

        for cell_x, cell_y in self.cells:
            x = cell_x * TILE_SIZE
            y = cell_y * TILE_SIZE

            is_center = (cell_x == self.center_x and cell_y == self.center_y)

            if progress < 0.3:
                size_factor = 0.3 + progress * 2
            else:
                size_factor = 0.9 - (progress - 0.3) * 0.8

            size = int(TILE_SIZE * size_factor)
            offset = (TILE_SIZE - size) // 2

            rect = pygame.Rect(x + offset, y + offset, size, size)

            if is_center:
                color = COLORS['explosion_center']
            else:
                color = COLORS['explosion']

            temp_surface = pygame.Surface((size, size), pygame.SRCALPHA)
            pygame.draw.ellipse(temp_surface, (*color, alpha), (0, 0, size, size))
            screen.blit(temp_surface, (x + offset, y + offset))

            if is_center:
                star_size = int(size * 0.6)
                star_offset = (size - star_size) // 2
                pygame.draw.polygon(temp_surface, (255, 255, 200, alpha), [
                    (star_offset + star_size // 2, star_offset),
                    (star_offset + star_size * 0.6, star_offset + star_size * 0.4),
                    (star_offset + star_size, star_offset + star_size // 2),
                    (star_offset + star_size * 0.6, star_offset + star_size * 0.6),
                    (star_offset + star_size // 2, star_offset + star_size),
                    (star_offset + star_size * 0.4, star_offset + star_size * 0.6),
                    (star_offset, star_offset + star_size // 2),
                    (star_offset + star_size * 0.4, star_offset + star_size * 0.4),
                ])
                screen.blit(temp_surface, (x + offset, y + offset))

    def get_cells(self) -> Set[Tuple[int, int]]:
        return self.cells


class ExplosionManager:
    def __init__(self):
        self.bubbles: List[Bubble] = []
        self.explosions: List[Explosion] = []

    def place_bubble(self, grid_x: int, grid_y: int, owner, bomb_range: int) -> bool:
        for bubble in self.bubbles:
            if bubble.grid_x == grid_x and bubble.grid_y == grid_y and not bubble.has_exploded:
                return False

        bubble = Bubble(grid_x, grid_y, owner, bomb_range)
        self.bubbles.append(bubble)
        return True

    def update(self, map_loader):
        current_time = pygame.time.get_ticks()
        bubbles_to_explode = []

        for bubble in self.bubbles:
            if bubble.update(current_time):
                bubbles_to_explode.append(bubble)

        for bubble in bubbles_to_explode:
            explosion = bubble.explode(self.bubbles, map_loader)
            if explosion:
                self.explosions.append(explosion)

        self.bubbles = [b for b in self.bubbles if not b.has_exploded]

        active_explosions = []
        for explosion in self.explosions:
            if explosion.update(current_time, map_loader):
                active_explosions.append(explosion)
        self.explosions = active_explosions

    def draw(self, screen):
        for bubble in self.bubbles:
            bubble.draw(screen)

        for explosion in self.explosions:
            explosion.draw(screen)

    def get_all_explosion_cells(self) -> Set[Tuple[int, int]]:
        cells = set()
        for explosion in self.explosions:
            if explosion.active:
                cells.update(explosion.get_cells())
        return cells

    def get_active_bubbles(self) -> List[Bubble]:
        return [b for b in self.bubbles if not b.has_exploded]

    def clear(self):
        self.bubbles = []
        self.explosions = []

    def has_active_explosions(self) -> bool:
        return any(e.active for e in self.explosions)
