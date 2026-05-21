import pygame
import sys
import os
import copy
from typing import List, Tuple, Optional
from src.constants import (
    SCREEN_WIDTH, SCREEN_HEIGHT, FPS, COLORS, TILE_SIZE,
    GRID_WIDTH, GRID_HEIGHT, GAME_STATES, TILE_TYPES
)
from src.map_loader import MapLoader
from src.player_controller import PlayerController
from src.enemy_ai import EnemyAIController
from src.explosion import ExplosionManager
from src.ui import UIManager, Button, get_chinese_font


class Game:
    def __init__(self):
        pygame.init()
        pygame.display.set_caption("泡泡堂大冒险")
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        self.clock = pygame.time.Clock()
        self.running = True

        self.game_state = GAME_STATES['MENU']
        self.prev_game_state = None
        self.num_players = 1
        self.current_level = 0
        self.available_maps: List[str] = []
        self.selected_map: Optional[str] = None
        self.game_time = 0
        self.last_time_update = 0
        self.scores = {}

        self.map_loader = MapLoader()
        self.player_controller: Optional[PlayerController] = None
        self.enemy_controller: Optional[EnemyAIController] = None
        self.explosion_manager = ExplosionManager()
        self.ui = UIManager(self.screen)

        self.original_map: List[List[int]] = []
        self.original_enemies: List[dict] = []
        self.original_spawns: List[Tuple[int, int]] = []

        self.close_button: Optional[Button] = None
        self._init_close_button()

        self._load_available_maps()

    def _init_close_button(self):
        btn_size = 40
        btn_x = SCREEN_WIDTH - btn_size - 10
        btn_y = 10
        self.close_button = Button(
            btn_x, btn_y, btn_size, btn_size,
            "✕", self._quit,
            color=(200, 50, 50),
            hover_color=(255, 80, 80),
            text_color=(255, 255, 255)
        )

    def _load_available_maps(self):
        self.available_maps = self.map_loader.get_available_maps()
        self.available_maps.sort()

    def run(self):
        while self.running:
            delta_time = self.clock.tick(FPS) / 1000.0
            self._handle_events()
            self._update(delta_time)
            self._render()
            pygame.display.flip()

        pygame.quit()
        sys.exit()

    def _handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False

            if self.close_button.handle_event(event):
                continue

            if self.game_state == GAME_STATES['MENU']:
                if self.ui.handle_events(event):
                    continue

            elif self.game_state == GAME_STATES['LEVEL_SELECT']:
                if self.ui.handle_events(event):
                    continue

            elif self.game_state == GAME_STATES['PLAYING']:
                if event.type == pygame.KEYDOWN:
                    if event.key == pygame.K_ESCAPE:
                        self.game_state = GAME_STATES['PAUSED']
                    elif event.key == pygame.K_r:
                        self._restart_level()

            elif self.game_state == GAME_STATES['PAUSED']:
                if self.ui.handle_events(event):
                    continue
                if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                    self.game_state = GAME_STATES['PLAYING']

            elif self.game_state in [GAME_STATES['GAME_OVER'], GAME_STATES['VICTORY']]:
                if self.ui.handle_events(event):
                    continue

    def _update(self, delta_time: float):
        if self.prev_game_state != self.game_state:
            self._on_state_change()
            self.prev_game_state = self.game_state

        if self.game_state == GAME_STATES['MENU']:
            self._draw_menu_content()

        elif self.game_state == GAME_STATES['LEVEL_SELECT']:
            self._draw_level_select_content()

        elif self.game_state == GAME_STATES['PLAYING']:
            self._update_gameplay(delta_time)

        elif self.game_state == GAME_STATES['PAUSED']:
            self._draw_pause_content()

        elif self.game_state == GAME_STATES['GAME_OVER']:
            self._draw_game_over_content()

        elif self.game_state == GAME_STATES['VICTORY']:
            self._draw_victory_content()

    def _on_state_change(self):
        self.ui.clear_buttons()

        if self.game_state == GAME_STATES['MENU']:
            self._setup_menu_buttons()
        elif self.game_state == GAME_STATES['LEVEL_SELECT']:
            self._setup_level_select_buttons()
        elif self.game_state == GAME_STATES['PAUSED']:
            self._setup_pause_buttons()
        elif self.game_state == GAME_STATES['GAME_OVER']:
            self._setup_game_over_buttons(victory=False)
        elif self.game_state == GAME_STATES['VICTORY']:
            self._setup_game_over_buttons(victory=True)

    def _setup_menu_buttons(self):
        center_x = SCREEN_WIDTH // 2
        button_width = 300
        button_height = 60
        button_x = center_x - button_width // 2
        button_y = 240
        button_spacing = 80

        self.ui.add_button(Button(
            button_x, button_y, button_width, button_height,
            "单人模式", self._start_single_player
        ))

        self.ui.add_button(Button(
            button_x, button_y + button_spacing, button_width, button_height,
            "双人模式", self._start_coop
        ))

        self.ui.add_button(Button(
            button_x, button_y + button_spacing * 2, button_width, button_height,
            "退出游戏", self._quit
        ))

    def _draw_menu_content(self):
        center_x = SCREEN_WIDTH // 2

        title_y = 100
        self.ui.draw_text("BOMBER ADVENTURE", center_x, title_y,
                          self.ui.font_large, COLORS['text_highlight'], center=True)

        subtitle_y = title_y + 60
        self.ui.draw_text("泡泡堂大冒险", center_x, subtitle_y,
                          self.ui.font_medium, COLORS['text'], center=True)

        controls_y = 480
        self.ui.draw_text("操作说明:", center_x, controls_y,
                          self.ui.font_small, COLORS['text_highlight'], center=True)
        self.ui.draw_text("P1: WASD 移动, 空格 放水泡", center_x, controls_y + 30,
                          self.ui.font_small, COLORS['text'], center=True)
        self.ui.draw_text("P2: 方向键 移动, 回车 放水泡", center_x, controls_y + 55,
                          self.ui.font_small, COLORS['text'], center=True)

    def _setup_level_select_buttons(self):
        center_x = SCREEN_WIDTH // 2
        button_width = 400
        button_height = 50
        button_x = center_x - button_width // 2
        start_y = 130
        button_spacing = 60

        for i, map_file in enumerate(self.available_maps):
            y = start_y + i * button_spacing
            self.ui.add_button(Button(
                button_x, y, button_width, button_height,
                f"第 {i + 1} 关: {map_file}",
                self._make_level_callback(i)
            ))

        back_y = start_y + len(self.available_maps) * button_spacing + 30
        self.ui.add_button(Button(
            center_x - 100, back_y, 200, 50,
            "返回主菜单", self._back_to_menu
        ))

    def _make_level_callback(self, level_index):
        def callback():
            self._select_level(self.available_maps[level_index])
        return callback

    def _draw_level_select_content(self):
        center_x = SCREEN_WIDTH // 2
        self.ui.draw_text("选择关卡", center_x, 60,
                          self.ui.font_large, COLORS['text_highlight'], center=True)

    def _setup_pause_buttons(self):
        center_x = SCREEN_WIDTH // 2
        button_width = 250
        button_height = 60
        button_x = center_x - button_width // 2
        start_y = 280
        button_spacing = 80

        self.ui.add_button(Button(
            button_x, start_y, button_width, button_height,
            "继续游戏", self._resume_game
        ))

        self.ui.add_button(Button(
            button_x, start_y + button_spacing, button_width, button_height,
            "重新开始", self._restart_level
        ))

        self.ui.add_button(Button(
            button_x, start_y + button_spacing * 2, button_width, button_height,
            "返回主菜单", self._back_to_menu
        ))

    def _draw_pause_content(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        self.screen.blit(overlay, (0, 0))

        center_x = SCREEN_WIDTH // 2
        self.ui.draw_text("游戏暂停", center_x, 180,
                          self.ui.font_large, COLORS['text_highlight'], center=True)

    def _setup_game_over_buttons(self, victory: bool = False):
        center_x = SCREEN_WIDTH // 2
        button_width = 250
        button_height = 60
        button_x = center_x - button_width // 2
        start_y = 350
        button_spacing = 80

        if victory:
            self.ui.add_button(Button(
                button_x, start_y, button_width, button_height,
                "下一关", self._next_level
            ))
        else:
            self.ui.add_button(Button(
                button_x, start_y, button_width, button_height,
                "再玩一次", self._restart_level
            ))

        self.ui.add_button(Button(
            button_x, start_y + button_spacing, button_width, button_height,
            "返回主菜单", self._back_to_menu
        ))

    def _draw_game_over_content(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 200))
        self.screen.blit(overlay, (0, 0))

        center_x = SCREEN_WIDTH // 2
        self.ui.draw_text("💀 游戏结束 💀", center_x, 160,
                          self.ui.font_large, (255, 100, 100), center=True)

        if self.scores:
            score_y = 240
            for player_id, score in self.scores.items():
                self.ui.draw_text(f"玩家 {player_id} 得分: {score}",
                                  center_x, score_y, self.ui.font_medium,
                                  COLORS['text'], center=True)
                score_y += 40

    def _draw_victory_content(self):
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 200))
        self.screen.blit(overlay, (0, 0))

        center_x = SCREEN_WIDTH // 2
        self.ui.draw_text("🎉 胜利! 🎉", center_x, 160,
                          self.ui.font_large, COLORS['text_highlight'], center=True)

        if self.scores:
            score_y = 240
            for player_id, score in self.scores.items():
                self.ui.draw_text(f"玩家 {player_id} 得分: {score}",
                                  center_x, score_y, self.ui.font_medium,
                                  COLORS['text'], center=True)
                score_y += 40

    def _update_gameplay(self, delta_time: float):
        keys = pygame.key.get_pressed()

        current_time = pygame.time.get_ticks()
        if current_time - self.last_time_update >= 1000:
            self.game_time += 1
            self.last_time_update = current_time

        new_bombs = self.player_controller.update(
            keys, self.map_loader,
            self.explosion_manager.get_active_bubbles(),
            delta_time
        )

        for bomb_data in new_bombs:
            self.explosion_manager.place_bubble(
                bomb_data['grid_x'],
                bomb_data['grid_y'],
                bomb_data['owner'],
                bomb_data['range']
            )

        self.enemy_controller.update(
            self.map_loader,
            self.explosion_manager.get_active_bubbles(),
            delta_time
        )

        self.explosion_manager.update(self.map_loader)

        explosion_cells = self.explosion_manager.get_all_explosion_cells()
        if explosion_cells:
            self.player_controller.check_collision_with_explosion(list(explosion_cells))
            killed_enemies = self.enemy_controller.check_collision_with_explosion(list(explosion_cells))
            for _ in killed_enemies:
                for player in self.player_controller.players:
                    if player.alive:
                        self.scores[player.player_id] = self.scores.get(player.player_id, 0) + 100

        self.enemy_controller.check_player_collisions(self.player_controller.players)

        if self.player_controller.is_game_over():
            self.game_state = GAME_STATES['GAME_OVER']

        if self.enemy_controller.all_enemies_dead():
            if self.map_loader.exit_pos:
                for player in self.player_controller.get_alive_players():
                    if player.get_grid_position() == self.map_loader.exit_pos:
                        self.game_state = GAME_STATES['VICTORY']
                        self.scores[player.player_id] = self.scores.get(player.player_id, 0) + 500
            else:
                self.game_state = GAME_STATES['VICTORY']
                for player in self.player_controller.get_alive_players():
                    self.scores[player.player_id] = self.scores.get(player.player_id, 0) + 500

    def _render(self):
        self.screen.fill(COLORS['background'])

        if self.game_state in [GAME_STATES['PLAYING'], GAME_STATES['PAUSED'],
                               GAME_STATES['GAME_OVER'], GAME_STATES['VICTORY']]:
            self._draw_map()
            self.explosion_manager.draw(self.screen)
            self.enemy_controller.draw(self.screen)
            self.player_controller.draw(self.screen)

            if self.map_loader.exit_pos:
                self._draw_exit()

            if self.game_state == GAME_STATES['PLAYING']:
                self.ui.draw_game_hud(
                    self.player_controller.players,
                    self.map_loader.level_name,
                    self.current_level,
                    len(self.enemy_controller.get_alive_enemies()),
                    self.game_time
                )

        self.ui.draw()
        self.close_button.draw(self.screen)

    def _draw_map(self):
        for y, row in enumerate(self.map_loader.tile_map):
            for x, tile in enumerate(row):
                rect = pygame.Rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)

                if tile == TILE_TYPES['EMPTY']:
                    pygame.draw.rect(self.screen, COLORS['floor'], rect)
                    pygame.draw.rect(self.screen, (80, 120, 200), rect, 1)
                elif tile == TILE_TYPES['WALL']:
                    pygame.draw.rect(self.screen, COLORS['wall'], rect)
                    pygame.draw.rect(self.screen, (50, 50, 50), rect, 2)
                    inner_rect = pygame.Rect(
                        x * TILE_SIZE + 4, y * TILE_SIZE + 4,
                        TILE_SIZE - 8, TILE_SIZE - 8
                    )
                    pygame.draw.rect(self.screen, (90, 90, 90), inner_rect)
                elif tile == TILE_TYPES['BOX']:
                    pygame.draw.rect(self.screen, COLORS['floor'], rect)
                    box_rect = pygame.Rect(
                        x * TILE_SIZE + 2, y * TILE_SIZE + 2,
                        TILE_SIZE - 4, TILE_SIZE - 4
                    )
                    pygame.draw.rect(self.screen, COLORS['box'], box_rect)
                    pygame.draw.rect(self.screen, (80, 40, 10), box_rect, 2)

                    pygame.draw.line(self.screen, (80, 40, 10),
                                     (x * TILE_SIZE + 2, y * TILE_SIZE + TILE_SIZE // 2),
                                     (x * TILE_SIZE + TILE_SIZE - 2, y * TILE_SIZE + TILE_SIZE // 2), 2)
                    pygame.draw.line(self.screen, (80, 40, 10),
                                     (x * TILE_SIZE + TILE_SIZE // 2, y * TILE_SIZE + 2),
                                     (x * TILE_SIZE + TILE_SIZE // 2, y * TILE_SIZE + TILE_SIZE - 2), 2)

    def _draw_exit(self):
        x, y = self.map_loader.exit_pos
        rect = pygame.Rect(x * TILE_SIZE + 4, y * TILE_SIZE + 4,
                           TILE_SIZE - 8, TILE_SIZE - 8)

        current_time = pygame.time.get_ticks()
        pulse = 0.7 + 0.3 * pygame.math.sin(current_time * 0.005)

        color = (int(50 * pulse), int(205 * pulse), int(50 * pulse))
        pygame.draw.rect(self.screen, color, rect, border_radius=8)
        pygame.draw.rect(self.screen, (0, 100, 0), rect, 3, border_radius=8)

        font = get_chinese_font(24)
        text = font.render("出口", True, (255, 255, 255))
        text_rect = text.get_rect(center=rect.center)
        self.screen.blit(text, text_rect)

    def _start_single_player(self):
        self.num_players = 1
        self.game_state = GAME_STATES['LEVEL_SELECT']

    def _start_coop(self):
        self.num_players = 2
        self.game_state = GAME_STATES['LEVEL_SELECT']

    def _select_level(self, map_file: str):
        self.selected_map = map_file
        self.current_level = self.available_maps.index(map_file) if map_file in self.available_maps else 0
        self._load_level(map_file)
        self.game_state = GAME_STATES['PLAYING']

    def _load_level(self, map_file: str):
        self.ui.draw_loading(f"加载关卡: {map_file}...")

        if not self.map_loader.load_map(map_file):
            print(f"Failed to load map: {map_file}")
            return

        self.original_map = copy.deepcopy(self.map_loader.tile_map)
        self.original_enemies = copy.deepcopy(self.map_loader.enemies)
        self.original_spawns = copy.deepcopy(self.map_loader.players_spawn)

        spawn_points = self.map_loader.players_spawn
        if len(spawn_points) < self.num_players:
            default_spawns = [(1, 1), (13, 11)]
            for i in range(len(spawn_points), self.num_players):
                spawn_points.append(default_spawns[i % len(default_spawns)])

        self.player_controller = PlayerController(self.num_players, spawn_points)
        self.enemy_controller = EnemyAIController(self.map_loader.enemies)
        self.explosion_manager.clear()

        self.game_time = 0
        self.last_time_update = pygame.time.get_ticks()
        self.scores = {}
        for i in range(1, self.num_players + 1):
            self.scores[i] = 0

    def _restart_level(self):
        if self.selected_map:
            self.map_loader.tile_map = copy.deepcopy(self.original_map)
            self.map_loader.enemies = copy.deepcopy(self.original_enemies)
            self.map_loader.players_spawn = copy.deepcopy(self.original_spawns)

            self.player_controller.reset(self.original_spawns)
            self.enemy_controller.reset(self.original_enemies)
            self.explosion_manager.clear()

            self.game_time = 0
            self.last_time_update = pygame.time.get_ticks()
            for i in range(1, self.num_players + 1):
                self.scores[i] = 0

            self.game_state = GAME_STATES['PLAYING']

    def _next_level(self):
        if self.current_level + 1 < len(self.available_maps):
            self.current_level += 1
            self.selected_map = self.available_maps[self.current_level]
            self._load_level(self.selected_map)
            self.game_state = GAME_STATES['PLAYING']
        else:
            self.ui.draw_message("恭喜通关所有关卡！")
            pygame.display.flip()
            pygame.time.wait(3000)
            self._back_to_menu()

    def _resume_game(self):
        self.game_state = GAME_STATES['PLAYING']

    def _back_to_menu(self):
        self.game_state = GAME_STATES['MENU']
        self.selected_map = None
        self.player_controller = None
        self.enemy_controller = None
        self.explosion_manager.clear()

    def _quit(self):
        self.running = False
