import pygame

TILE_SIZE = 48
GRID_WIDTH = 15
GRID_HEIGHT = 13
SCREEN_WIDTH = GRID_WIDTH * TILE_SIZE
SCREEN_HEIGHT = GRID_HEIGHT * TILE_SIZE + 100
FPS = 60

COLORS = {
    'background': (30, 30, 30),
    'floor': (100, 149, 237),
    'wall': (70, 70, 70),
    'box': (139, 69, 19),
    'player1': (0, 191, 255),
    'player2': (255, 99, 71),
    'enemy_normal': (255, 0, 0),
    'enemy_static': (255, 165, 0),
    'bubble': (0, 255, 255),
    'explosion': (255, 215, 0),
    'explosion_center': (255, 69, 0),
    'ui_bg': (50, 50, 50),
    'text': (255, 255, 255),
    'text_highlight': (255, 215, 0),
    'button': (70, 130, 180),
    'button_hover': (100, 149, 237),
}

TILE_TYPES = {
    'EMPTY': 0,
    'WALL': 1,
    'BOX': 2,
    'PLAYER1_SPAWN': 3,
    'PLAYER2_SPAWN': 4,
    'ENEMY_NORMAL': 5,
    'ENEMY_STATIC': 6,
    'EXIT': 7,
}

PLAYER_SPEED = 3
BUBBLE_TIME = 2000
EXPLOSION_TIME = 500
DEFAULT_BOMB_RANGE = 2
DEFAULT_MAX_BUBBLES = 1

DIRECTIONS = {
    'UP': (0, -1),
    'DOWN': (0, 1),
    'LEFT': (-1, 0),
    'RIGHT': (1, 0),
}

P1_CONTROLS = {
    'UP': pygame.K_w,
    'DOWN': pygame.K_s,
    'LEFT': pygame.K_a,
    'RIGHT': pygame.K_d,
    'BOMB': pygame.K_SPACE,
}

P2_CONTROLS = {
    'UP': pygame.K_UP,
    'DOWN': pygame.K_DOWN,
    'LEFT': pygame.K_LEFT,
    'RIGHT': pygame.K_RIGHT,
    'BOMB': pygame.K_RETURN,
}

GAME_STATES = {
    'MENU': 'menu',
    'LEVEL_SELECT': 'level_select',
    'PLAYING': 'playing',
    'PAUSED': 'paused',
    'GAME_OVER': 'game_over',
    'VICTORY': 'victory',
}

ENEMY_SPEED = 2
ENEMY_CHANGE_DIR_TIME = 2000
