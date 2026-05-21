import random
from config import GRID_W, GRID_H, EMPTY, WALL, BRICK


def generate_map(level=1):
    grid = []
    for y in range(GRID_H):
        row = []
        for x in range(GRID_W):
            if x == 0 or y == 0 or x == GRID_W - 1 or y == GRID_H - 1:
                row.append(WALL)
            elif x % 2 == 0 and y % 2 == 0:
                row.append(WALL)
            else:
                row.append(EMPTY)
        grid.append(row)

    safe_cells = set()
    for (dx, dy) in [(1, 1), (2, 1), (1, 2),
                     (GRID_W - 2, 1), (GRID_W - 3, 1), (GRID_W - 2, 2),
                     (1, GRID_H - 2), (2, GRID_H - 2), (1, GRID_H - 3)]:
        safe_cells.add((dx, dy))

    brick_density = 0.55 + min(0.2, 0.05 * (level - 1))
    for y in range(1, GRID_H - 1):
        for x in range(1, GRID_W - 1):
            if grid[y][x] == EMPTY and (x, y) not in safe_cells:
                if random.random() < brick_density:
                    grid[y][x] = BRICK

    return grid


def enemy_spawn_positions(grid, n):
    forbidden = {(1, 1), (2, 1), (1, 2),
                 (GRID_W - 2, 1), (GRID_W - 3, 1), (GRID_W - 2, 2),
                 (1, GRID_H - 2), (2, GRID_H - 2), (1, GRID_H - 3)}
    candidates = []
    for y in range(1, GRID_H - 1):
        for x in range(1, GRID_W - 1):
            if grid[y][x] == EMPTY and (x, y) not in forbidden:
                dx = abs(x - 1)
                dy = abs(y - 1)
                if dx * dx + dy * dy >= 16:
                    candidates.append((x, y))
    random.shuffle(candidates)
    return candidates[:n]
