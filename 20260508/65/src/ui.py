import pygame
import os
import sys
from typing import List, Tuple, Callable, Optional
from src.constants import COLORS, SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, GRID_HEIGHT


def get_chinese_font(size: int):
    font_paths = [
        "C:/Windows/Fonts/msyh.ttc",
        "C:/Windows/Fonts/simhei.ttf",
        "C:/Windows/Fonts/simsun.ttc",
        "C:/Windows/Fonts/msyh.ttf",
        "/System/Library/Fonts/PingFang.ttc",
        "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",
        "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    ]
    
    for path in font_paths:
        if os.path.exists(path):
            try:
                return pygame.font.Font(path, size)
            except:
                continue
    
    try:
        return pygame.font.SysFont("microsoftyahei,simhei,simsun,arial", size)
    except:
        return pygame.font.Font(None, size)


class Button:
    def __init__(self, x: int, y: int, width: int, height: int, text: str,
                 on_click: Callable = None, color: tuple = None,
                 hover_color: tuple = None, text_color: tuple = None):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.on_click = on_click
        self.color = color if color else COLORS['button']
        self.hover_color = hover_color if hover_color else COLORS['button_hover']
        self.text_color = text_color if text_color else COLORS['text']
        self.is_hovered = False
        self.font = get_chinese_font(32)

    def handle_event(self, event):
        if event.type == pygame.MOUSEMOTION:
            self.is_hovered = self.rect.collidepoint(event.pos)
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            if self.is_hovered and self.on_click:
                self.on_click()
                return True
        return False

    def draw(self, screen):
        color = self.hover_color if self.is_hovered else self.color
        pygame.draw.rect(screen, color, self.rect, border_radius=8)
        pygame.draw.rect(screen, (0, 0, 0), self.rect, 2, border_radius=8)

        text_surface = self.font.render(self.text, True, self.text_color)
        text_rect = text_surface.get_rect(center=self.rect.center)
        screen.blit(text_surface, text_rect)


class UIManager:
    def __init__(self, screen):
        self.screen = screen
        self.buttons: List[Button] = []
        self.font_large = get_chinese_font(64)
        self.font_medium = get_chinese_font(36)
        self.font_small = get_chinese_font(24)

    def clear_buttons(self):
        self.buttons = []

    def add_button(self, button: Button):
        self.buttons.append(button)

    def handle_events(self, event):
        for button in self.buttons:
            if button.handle_event(event):
                return True
        return False

    def draw(self):
        for button in self.buttons:
            button.draw(self.screen)

    def draw_text(self, text: str, x: int, y: int, font=None,
                  color: tuple = None, center: bool = False):
        if font is None:
            font = self.font_medium
        if color is None:
            color = COLORS['text']

        text_surface = font.render(text, True, color)
        if center:
            rect = text_surface.get_rect(center=(x, y))
            self.screen.blit(text_surface, rect)
        else:
            self.screen.blit(text_surface, (x, y))

    def draw_menu(self, game_title: str, on_start_single: Callable,
                  on_start_coop: Callable, on_quit: Callable):
        self.clear_buttons()

        center_x = SCREEN_WIDTH // 2

        title_y = 100
        self.draw_text(game_title, center_x, title_y, self.font_large,
                       COLORS['text_highlight'], center=True)

        subtitle_y = title_y + 60
        self.draw_text("泡泡堂大冒险", center_x, subtitle_y, self.font_medium,
                       COLORS['text'], center=True)

        button_width = 300
        button_height = 60
        button_x = center_x - button_width // 2
        button_y = subtitle_y + 80
        button_spacing = 80

        self.add_button(Button(
            button_x, button_y, button_width, button_height,
            "单人模式", on_start_single
        ))

        self.add_button(Button(
            button_x, button_y + button_spacing, button_width, button_height,
            "双人模式", on_start_coop
        ))

        self.add_button(Button(
            button_x, button_y + button_spacing * 2, button_width, button_height,
            "退出游戏", on_quit
        ))

        controls_y = button_y + button_spacing * 3 + 40
        self.draw_text("操作说明:", center_x, controls_y,
                       self.font_small, COLORS['text_highlight'], center=True)
        self.draw_text("P1: WASD 移动, 空格 放水泡", center_x, controls_y + 30,
                       self.font_small, COLORS['text'], center=True)
        self.draw_text("P2: 方向键 移动, 回车 放水泡", center_x, controls_y + 55,
                       self.font_small, COLORS['text'], center=True)

    def draw_level_select(self, available_maps: List[str], on_select_level: Callable,
                          on_back: Callable):
        self.clear_buttons()

        center_x = SCREEN_WIDTH // 2

        self.draw_text("选择关卡", center_x, 60, self.font_large,
                       COLORS['text_highlight'], center=True)

        button_width = 400
        button_height = 50
        button_x = center_x - button_width // 2
        start_y = 130
        button_spacing = 60

        for i, map_file in enumerate(available_maps):
            level_name = map_file
            y = start_y + i * button_spacing

            def make_callback(filename):
                return lambda: on_select_level(filename)

            self.add_button(Button(
                button_x, y, button_width, button_height,
                f"第 {i + 1} 关: {level_name}", make_callback(map_file)
            ))

        back_y = start_y + len(available_maps) * button_spacing + 30
        self.add_button(Button(
            center_x - 100, back_y, 200, 50,
            "返回主菜单", on_back
        ))

    def draw_game_hud(self, players, level_name: str, current_level: int,
                      num_enemies: int, game_time: int):
        hud_y = GRID_HEIGHT * TILE_SIZE
        hud_height = SCREEN_HEIGHT - hud_y

        hud_rect = pygame.Rect(0, hud_y, SCREEN_WIDTH, hud_height)
        pygame.draw.rect(self.screen, COLORS['ui_bg'], hud_rect)
        pygame.draw.line(self.screen, (100, 100, 100),
                         (0, hud_y), (SCREEN_WIDTH, hud_y), 2)

        self.draw_text(f"关卡: {current_level + 1} - {level_name}", 20, hud_y + 15,
                       self.font_small, COLORS['text_highlight'])

        minutes = game_time // 60
        seconds = game_time % 60
        self.draw_text(f"时间: {minutes:02d}:{seconds:02d}", 20, hud_y + 45,
                       self.font_small, COLORS['text'])

        self.draw_text(f"敌人: {num_enemies}", 200, hud_y + 15,
                       self.font_small, COLORS['text_highlight'])

        player_x = 350
        for i, player in enumerate(players):
            status_color = COLORS['text'] if player.alive else (255, 100, 100)
            status = "存活" if player.alive else "阵亡"

            self.draw_text(f"P{player.player_id}: {status}", player_x, hud_y + 15,
                           self.font_small, player.color)
            self.draw_text(f"水泡: {player.active_bubbles}/{player.max_bubbles} "
                           f"范围: {player.bomb_range}",
                           player_x, hud_y + 45, self.font_small, status_color)
            player_x += 200

        self.draw_text("ESC: 暂停", SCREEN_WIDTH - 120, hud_y + 15,
                       self.font_small, COLORS['text'])
        self.draw_text("R: 重玩", SCREEN_WIDTH - 120, hud_y + 45,
                       self.font_small, COLORS['text'])

    def draw_pause_menu(self, on_resume: Callable, on_restart: Callable,
                        on_quit: Callable):
        self.clear_buttons()

        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        self.screen.blit(overlay, (0, 0))

        center_x = SCREEN_WIDTH // 2

        self.draw_text("游戏暂停", center_x, 180, self.font_large,
                       COLORS['text_highlight'], center=True)

        button_width = 250
        button_height = 60
        button_x = center_x - button_width // 2
        start_y = 280
        button_spacing = 80

        self.add_button(Button(
            button_x, start_y, button_width, button_height,
            "继续游戏", on_resume
        ))

        self.add_button(Button(
            button_x, start_y + button_spacing, button_width, button_height,
            "重新开始", on_restart
        ))

        self.add_button(Button(
            button_x, start_y + button_spacing * 2, button_width, button_height,
            "返回主菜单", on_quit
        ))

    def draw_game_over(self, on_restart: Callable, on_menu: Callable,
                       victory: bool = False, scores: dict = None):
        self.clear_buttons()

        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 200))
        self.screen.blit(overlay, (0, 0))

        center_x = SCREEN_WIDTH // 2

        if victory:
            title_text = "🎉 胜利! 🎉"
            title_color = COLORS['text_highlight']
        else:
            title_text = "💀 游戏结束 💀"
            title_color = (255, 100, 100)

        self.draw_text(title_text, center_x, 160, self.font_large,
                       title_color, center=True)

        if scores:
            score_y = 240
            for player_id, score in scores.items():
                self.draw_text(f"玩家 {player_id} 得分: {score}",
                               center_x, score_y, self.font_medium,
                               COLORS['text'], center=True)
                score_y += 40

        button_width = 250
        button_height = 60
        button_x = center_x - button_width // 2
        start_y = 350
        button_spacing = 80

        self.add_button(Button(
            button_x, start_y, button_width, button_height,
            "再玩一次", on_restart
        ))

        self.add_button(Button(
            button_x, start_y + button_spacing, button_width, button_height,
            "返回主菜单", on_menu
        ))

    def draw_loading(self, text: str = "加载中..."):
        self.screen.fill(COLORS['background'])
        center_x = SCREEN_WIDTH // 2
        center_y = SCREEN_HEIGHT // 2

        self.draw_text(text, center_x, center_y, self.font_large,
                       COLORS['text_highlight'], center=True)
        pygame.display.flip()

    def draw_map_preview(self, tile_map: List[List[int]], x: int, y: int,
                         scale: float = 0.5):
        if not tile_map:
            return

        tile_size = int(TILE_SIZE * scale)
        for map_y, row in enumerate(tile_map):
            for map_x, tile in enumerate(row):
                rect = pygame.Rect(
                    x + map_x * tile_size,
                    y + map_y * tile_size,
                    tile_size, tile_size
                )

                if tile == 0:
                    color = COLORS['floor']
                elif tile == 1:
                    color = COLORS['wall']
                elif tile == 2:
                    color = COLORS['box']
                else:
                    color = COLORS['floor']

                pygame.draw.rect(self.screen, color, rect)
                pygame.draw.rect(self.screen, (0, 0, 0), rect, 1)

    def draw_message(self, text: str, duration: int = 2000,
                     color: tuple = None):
        if color is None:
            color = COLORS['text_highlight']

        center_x = SCREEN_WIDTH // 2
        center_y = SCREEN_HEIGHT // 3

        overlay = pygame.Surface((SCREEN_WIDTH, 100), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 150))
        self.screen.blit(overlay, (0, center_y - 50))

        self.draw_text(text, center_x, center_y, self.font_medium,
                       color, center=True)
