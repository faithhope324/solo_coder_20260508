from config import TILE_SIZE, GRID_W, GRID_H, EMPTY, WALL, BRICK


def cell_for_pos(x, y):
    return x // TILE_SIZE, y // TILE_SIZE


def in_bounds(cx, cy):
    return 0 <= cx < GRID_W and 0 <= cy < GRID_H


def is_blocking(tile, pass_wall=False):
    if tile == WALL:
        return True
    if tile == BRICK and not pass_wall:
        return True
    return False


def can_enter(grid, cx, cy, pass_wall=False, bombs=None):
    if not in_bounds(cx, cy):
        return False
    if bombs is not None:
        for b in bombs:
            if (not b.exploded) and b.cx == cx and b.cy == cy:
                return False
    return not is_blocking(grid[cy][cx], pass_wall)


def rect_blocked(grid, left, top, w, h, pass_wall=False, bombs=None):
    right = left + w - 1
    bottom = top + h - 1
    cx1 = left // TILE_SIZE
    cy1 = top // TILE_SIZE
    cx2 = right // TILE_SIZE
    cy2 = bottom // TILE_SIZE
    for cy in range(cy1, cy2 + 1):
        for cx in range(cx1, cx2 + 1):
            if not can_enter(grid, cx, cy, pass_wall=pass_wall, bombs=bombs):
                return True
    return False


def move_entity(grid, entity, dx, dy, bombs=None):
    size = entity.size
    nx = entity.x + dx
    ny = entity.y + dy
    if not rect_blocked(grid, nx, entity.y, size, size,
                        pass_wall=entity.pass_wall, bombs=bombs):
        entity.x = nx
    if not rect_blocked(grid, entity.x, ny, size, size,
                        pass_wall=entity.pass_wall, bombs=bombs):
        entity.y = ny
    entity.x = max(0, min(entity.x, GRID_W * TILE_SIZE - size))
    entity.y = max(0, min(entity.y, GRID_H * TILE_SIZE - size))


def explode_cell(grid, cx, cy):
    if not in_bounds(cx, cy):
        return False
    if grid[cy][cx] == BRICK:
        grid[cy][cx] = EMPTY
        return True
    return False


def is_solid_cell(grid, cx, cy):
    if not in_bounds(cx, cy):
        return False
    return grid[cy][cx] in (WALL, BRICK)
