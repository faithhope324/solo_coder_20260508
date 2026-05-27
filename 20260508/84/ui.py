import pygame

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
DARK_GRAY = (40, 40, 40)
LIGHT_GRAY = (200, 200, 200)
GREEN = (0, 200, 0)
RED = (220, 50, 50)
GOLD = (255, 215, 0)
BASKET_COLOR = (139, 90, 43)
BASKET_DARK = (100, 60, 20)

BASKET_WIDTH = 100
BASKET_HEIGHT = 60
BASKET_SPEED = 8


class Basket:
    def __init__(self, screen_width, screen_height):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.width = BASKET_WIDTH
        self.height = BASKET_HEIGHT
        self.x = screen_width // 2 - self.width // 2
        self.y = screen_height - self.height - 20
        self.rect = pygame.Rect(self.x, self.y, self.width, self.height)

    def move_with_mouse(self, mouse_x):
        self.x = max(0, min(self.screen_width - self.width, mouse_x - self.width // 2))
        self.rect.x = self.x

    def move_with_keys(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.x = max(0, self.x - BASKET_SPEED)
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.x = min(self.screen_width - self.width, self.x + BASKET_SPEED)
        self.rect.x = self.x

    def draw(self, screen):
        pygame.draw.ellipse(screen, BASKET_COLOR, self.rect)
        rim_rect = pygame.Rect(
            self.x, self.y, self.width, self.height // 3
        )
        pygame.draw.ellipse(screen, BASKET_DARK, rim_rect)
        pygame.draw.line(
            screen,
            BASKET_DARK,
            (self.x + 10, self.y + 15),
            (self.x + 20, self.y + self.height - 10),
            2,
        )
        pygame.draw.line(
            screen,
            BASKET_DARK,
            (self.x + self.width - 10, self.y + 15),
            (self.x + self.width - 20, self.y + self.height - 10),
            2,
        )
        pygame.draw.line(
            screen,
            BASKET_DARK,
            (self.x + self.width // 2, self.y + 15),
            (self.x + self.width // 2, self.y + self.height - 10),
            2,
        )

    def reset(self):
        self.x = self.screen_width // 2 - self.width // 2
        self.rect.x = self.x


def _get_chinese_font():
    font_names = ["simhei", "microsoftyahei", "microsoftyaheiui", "dengxian", "kaiti", "simsun", "arialunicodems", "notosanscjksc", "pingfangsc", "stheitisc"]
    for name in font_names:
        font = pygame.font.SysFont(name, 24)
        if font.render("测试", True, (0, 0, 0)).get_width() > 0:
            return name
    return None


class UIManager:
    def __init__(self, screen_width, screen_height):
        self.screen_width = screen_width
        self.screen_height = screen_height
        font_name = _get_chinese_font()
        self.font_large = pygame.font.SysFont(font_name, 48) if font_name else pygame.font.Font(None, 48)
        self.font_medium = pygame.font.SysFont(font_name, 32) if font_name else pygame.font.Font(None, 32)
        self.font_small = pygame.font.SysFont(font_name, 24) if font_name else pygame.font.Font(None, 24)

    def draw_start_screen(self, screen, high_score):
        screen.fill(WHITE)

        title = self.font_large.render("接金币游戏", True, GOLD)
        title_rect = title.get_rect(center=(self.screen_width // 2, 150))
        screen.blit(title, title_rect)

        hs_text = self.font_medium.render(f"最高分: {high_score}", True, DARK_GRAY)
        hs_rect = hs_text.get_rect(center=(self.screen_width // 2, 230))
        screen.blit(hs_text, hs_rect)

        start_text = self.font_medium.render("点击鼠标或按空格键开始游戏", True, GREEN)
        start_rect = start_text.get_rect(center=(self.screen_width // 2, 330))
        screen.blit(start_text, start_rect)

        info1 = self.font_small.render("鼠标移动 或 ← → / A D 键控制篮子", True, DARK_GRAY)
        info1_rect = info1.get_rect(center=(self.screen_width // 2, 400))
        screen.blit(info1, info1_rect)

        info2 = self.font_small.render("接住金币 +10分 | 碰到炸弹 -1生命", True, RED)
        info2_rect = info2.get_rect(center=(self.screen_width // 2, 440))
        screen.blit(info2, info2_rect)

    def draw_game_screen(self, screen, score_manager):
        score_text = self.font_medium.render(f"分数: {score_manager.score}", True, BLACK)
        screen.blit(score_text, (20, 20))

        lives_text = self.font_medium.render(f"生命: {score_manager.lives}", True, RED)
        screen.blit(lives_text, (20, 60))

        speed_mult = score_manager.get_speed_multiplier()
        speed_text = self.font_small.render(f"速度: x{speed_mult:.2f}", True, (0, 100, 200))
        screen.blit(speed_text, (20, 100))

        hs_text = self.font_small.render(
            f"最高分: {score_manager.high_score}", True, DARK_GRAY
        )
        screen.blit(hs_text, (20, 130))

    def draw_game_over_screen(self, screen, score_manager):
        overlay = pygame.Surface((self.screen_width, self.screen_height), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 150))
        screen.blit(overlay, (0, 0))

        game_over = self.font_large.render("游戏结束!", True, RED)
        go_rect = game_over.get_rect(center=(self.screen_width // 2, 200))
        screen.blit(game_over, go_rect)

        final_score = self.font_medium.render(
            f"最终得分: {score_manager.score}", True, WHITE
        )
        fs_rect = final_score.get_rect(center=(self.screen_width // 2, 280))
        screen.blit(final_score, fs_rect)

        if score_manager.score >= score_manager.high_score and score_manager.score > 0:
            new_hs = self.font_medium.render("新纪录!", True, GOLD)
            nh_rect = new_hs.get_rect(center=(self.screen_width // 2, 330))
            screen.blit(new_hs, nh_rect)

        hs_text = self.font_medium.render(
            f"最高分: {score_manager.high_score}", True, LIGHT_GRAY
        )
        hs_rect = hs_text.get_rect(center=(self.screen_width // 2, 380))
        screen.blit(hs_text, hs_rect)

        restart = self.font_medium.render("点击鼠标或按空格键重新开始", True, GREEN)
        restart_rect = restart.get_rect(center=(self.screen_width // 2, 460))
        screen.blit(restart, restart_rect)
