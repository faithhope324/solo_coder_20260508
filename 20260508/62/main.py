import sys
import pygame
from config import (TILE_SIZE, GRID_W, GRID_H, SCREEN_W, SCREEN_H, FPS,
                    EMPTY, WALL, BRICK,
                    COLOR_BG, COLOR_EMPTY, COLOR_EMPTY_ALT, COLOR_WALL,
                    COLOR_BRICK, COLOR_TEXT,
                    KEY_BINDINGS, POWERUP_NAMES)
from font_utils import get_font
from map_generator import generate_map, enemy_spawn_positions
from player import Player
from enemy import Enemy
from bomb import Bomb, compute_explosion_cells
from powerup import PowerUp, maybe_drop_powerup, draw_powerups


def draw_map(surface, grid):
    for y in range(GRID_H):
        for x in range(GRID_W):
            tile = grid[y][x]
            rect = pygame.Rect(x * TILE_SIZE, y * TILE_SIZE,
                               TILE_SIZE, TILE_SIZE)
            if tile == WALL:
                pygame.draw.rect(surface, COLOR_WALL, rect)
                pygame.draw.rect(surface, (40, 40, 40), rect, 2)
            elif tile == BRICK:
                base = COLOR_EMPTY if (x + y) % 2 == 0 else COLOR_EMPTY_ALT
                pygame.draw.rect(surface, base, rect)
                pygame.draw.rect(surface, COLOR_BRICK,
                                 rect.inflate(-4, -4), border_radius=3)
                pygame.draw.rect(surface, (120, 70, 30),
                                 rect.inflate(-4, -4), 2, border_radius=3)
            else:
                base = COLOR_EMPTY if (x + y) % 2 == 0 else COLOR_EMPTY_ALT
                pygame.draw.rect(surface, base, rect)


def draw_hud(surface, player, level, time_survived):
    hud_rect = pygame.Rect(0, GRID_H * TILE_SIZE, SCREEN_W, 40)
    pygame.draw.rect(surface, (20, 20, 20), hud_rect)
    font = get_font(18, bold=True)
    texts = [
        f"Level: {level}",
        f"Bombs: {player.active_bombs}/{player.max_bombs}",
        f"Fire: {player.radius}",
        f"Speed: {player.speed:.1f}",
        f"WallPass: {'YES' if player.pass_wall else 'NO'}",
        f"Time: {int(time_survived)}s",
    ]
    x = 10
    for t in texts:
        surf = font.render(t, True, COLOR_TEXT)
        surface.blit(surf, (x, GRID_H * TILE_SIZE + 10))
        x += surf.get_width() + 20
    if player.last_pickup:
        name = POWERUP_NAMES.get(player.last_pickup, player.last_pickup)
        surf = font.render(f"Got: {name}", True, (255, 220, 80))
        surface.blit(surf, (SCREEN_W - surf.get_width() - 10,
                            GRID_H * TILE_SIZE + 10))


def show_text_screen(surface, title, subtitle):
    font_big = get_font(48, bold=True)
    font_small = get_font(24)
    t1 = font_big.render(title, True, COLOR_TEXT)
    t2 = font_small.render(subtitle, True, COLOR_TEXT)
    surface.fill((0, 0, 0))
    surface.blit(t1, t1.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2 - 20)))
    surface.blit(t2, t2.get_rect(center=(SCREEN_W // 2, SCREEN_H // 2 + 30)))
    pygame.display.flip()


def setup_level(level):
    grid = generate_map(level)
    player = Player(1, 1)
    num_enemies = min(2 + level, 10)
    spawns = enemy_spawn_positions(grid, num_enemies)
    enemies = [Enemy(cx, cy) for (cx, cy) in spawns]
    bombs = []
    powerups = []
    return grid, player, enemies, bombs, powerups


def handle_powerup_pickups(player, powerups):
    remaining = []
    for p in powerups:
        pr = pygame.Rect(p.cx * TILE_SIZE, p.cy * TILE_SIZE,
                         TILE_SIZE, TILE_SIZE)
        if player.rect.colliderect(pr):
            player.apply_powerup(p.type)
        else:
            remaining.append(p)
    powerups[:] = remaining


def check_deaths(player, enemies, bombs):
    explosion_cells = compute_explosion_cells(bombs)
    px, py = player.cell()
    if (px, py) in explosion_cells:
        player.alive = False
    for e in enemies:
        if not e.alive:
            continue
        ecx, ecy = e.cell()
        if (ecx, ecy) in explosion_cells:
            e.alive = False
            continue
        if player.alive and e.rect.colliderect(player.rect):
            player.alive = False


def place_powerups_from_bricks(grid, prev_grid, powerups):
    for y in range(GRID_H):
        for x in range(GRID_W):
            if prev_grid[y][x] == BRICK and grid[y][x] == EMPTY:
                already = any(pp.cx == x and pp.cy == y for pp in powerups)
                if not already:
                    pu = maybe_drop_powerup(x, y)
                    if pu:
                        powerups.append(pu)


def main():
    pygame.init()
    pygame.font.init()
    screen = pygame.display.set_mode((SCREEN_W, SCREEN_H))
    pygame.display.set_caption("PyBomber")
    clock = pygame.time.Clock()

    get_font(18, bold=True)
    get_font(24)
    get_font(48, bold=True)

    level = 1
    grid, player, enemies, bombs, powerups = setup_level(level)
    time_survived = 0.0
    game_state = 'start'
    pending_bomb = False

    while True:
        dt = clock.tick(FPS)

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if game_state == 'start':
                    game_state = 'playing'
                if event.key == KEY_BINDINGS['bomb']:
                    if game_state == 'playing':
                        pending_bomb = True
                if event.key == pygame.K_r:
                    if game_state in ('gameover', 'victory'):
                        level = 1
                        grid, player, enemies, bombs, powerups = setup_level(level)
                        time_survived = 0.0
                        game_state = 'playing'
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()

        if game_state == 'start':
            show_text_screen(screen, "PyBomber",
                             "Arrows move, Space plant bomb - Press any key")

        elif game_state == 'playing':
            time_survived += dt / 1000.0
            keys = pygame.key.get_pressed()
            player.update(keys, grid, bombs, KEY_BINDINGS)

            if pending_bomb:
                if player.can_place_bomb(bombs):
                    cx, cy = player.cell()
                    bombs.append(Bomb(cx, cy, radius=player.radius,
                                      owner=player))
                    player.active_bombs += 1
                pending_bomb = False

            for e in enemies:
                e.update(grid, player, bombs)

            prev_grid = [row[:] for row in grid]
            for b in bombs:
                b.update(dt, grid, powerups)
            place_powerups_from_bricks(grid, prev_grid, powerups)

            handle_powerup_pickups(player, powerups)

            check_deaths(player, enemies, bombs)

            bombs = [b for b in bombs if b.is_active()]

            if not player.alive:
                game_state = 'gameover'
            elif not any(e.alive for e in enemies):
                if level >= 5:
                    game_state = 'victory'
                else:
                    level += 1
                    grid, player, enemies, bombs, powerups = setup_level(level)

            screen.fill(COLOR_BG)
            draw_map(screen, grid)
            draw_powerups(powerups, screen)
            for b in bombs:
                b.draw(screen)
            player.draw(screen)
            for e in enemies:
                e.draw(screen)
            draw_hud(screen, player, level, time_survived)
            pygame.display.flip()

        elif game_state == 'gameover':
            show_text_screen(screen, "GAME OVER",
                             f"Reached Level {level} - R to retry, ESC to quit")
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_r:
                        level = 1
                        grid, player, enemies, bombs, powerups = setup_level(level)
                        time_survived = 0.0
                        game_state = 'playing'
                    if event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()

        elif game_state == 'victory':
            show_text_screen(screen, "VICTORY!",
                             "You beat all levels! - R to retry, ESC to quit")
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    pygame.quit()
                    sys.exit()
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_r:
                        level = 1
                        grid, player, enemies, bombs, powerups = setup_level(level)
                        time_survived = 0.0
                        game_state = 'playing'
                    if event.key == pygame.K_ESCAPE:
                        pygame.quit()
                        sys.exit()


if __name__ == '__main__':
    main()
