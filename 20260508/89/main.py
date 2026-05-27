import pygame
import random
import sys
from config import *
from fish_database import FishDatabase
from weather_system import WeatherSystem
from shop_system import ShopSystem
from casting_system import CastingSystem
from qte_system import QTESystem

class GameState:
    MENU = "menu"
    PLAYING = "playing"
    SHOP = "shop"
    CASTING = "casting"
    WAITING = "waiting"
    QTE = "qte"
    RESULT = "result"

class FishingGame:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("钓鱼大师")
        self.clock = pygame.time.Clock()

        font_names = ["microsoftyahei", "simsun", "simhei", "msyh", "Segoe UI"]
        self.font = self.get_chinese_font(font_names, 28)
        self.large_font = self.get_chinese_font(font_names, 48)

        self.fish_db = FishDatabase()
        self.weather = WeatherSystem()
        self.shop = ShopSystem()
        self.casting = CastingSystem()
        self.qte = QTESystem()

        self.state = GameState.MENU
        self.player_x = PLAYER_START_X
        self.player_y = PLAYER_START_Y

        self.wait_timer = 0
        self.bite_chance = 0
        self.current_fish = None
        self.showing_result = False

        self.background_fish = []
        self.init_background_fish()

        self.splash_particles = []
        self.bite_animation_timer = 0

    def get_chinese_font(self, font_names, size):
        for name in font_names:
            try:
                font = pygame.font.SysFont(name, size)
                test = font.render("测试", True, BLACK)
                return font
            except:
                continue
        return pygame.font.Font(None, size)

    def init_background_fish(self):
        for _ in range(15):
            self.background_fish.append({
                'x': random.randint(0, SCREEN_WIDTH),
                'y': random.randint(WATER_TOP, WATER_BOTTOM),
                'speed': random.uniform(0.5, 2.0),
                'direction': random.choice([-1, 1]),
                'color': (
                    random.randint(100, 200),
                    random.randint(100, 200),
                    random.randint(150, 255)
                ),
                'size': random.randint(10, 25)
            })

    def run(self):
        running = True
        while running:
            dt = self.clock.tick(FPS) / 1000
            running = self.handle_events()
            self.update()
            self.draw()
            pygame.display.flip()
        pygame.quit()
        sys.exit()

    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                return False

            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1:
                    mouse_x, mouse_y = event.pos
                    if hasattr(self, 'close_button_rect'):
                        if self.close_button_rect.collidepoint(mouse_x, mouse_y):
                            if self.state in [GameState.PLAYING, GameState.SHOP, GameState.CASTING, GameState.WAITING, GameState.QTE, GameState.RESULT]:
                                self.reset_game_state()
                                self.state = GameState.MENU
                                continue
                    if self.state == GameState.MENU:
                        if hasattr(self, 'menu_button_rect'):
                            if self.menu_button_rect.collidepoint(mouse_x, mouse_y):
                                self.state = GameState.PLAYING
                                continue

            if event.type == pygame.KEYDOWN:
                if self.state == GameState.MENU:
                    if event.key == pygame.K_SPACE:
                        self.state = GameState.PLAYING
                    elif event.key == pygame.K_ESCAPE:
                        return False

                elif self.state == GameState.SHOP:
                    if event.key == pygame.K_ESCAPE:
                        self.state = GameState.PLAYING
                    elif event.key in [pygame.K_1, pygame.K_2, pygame.K_3, pygame.K_4]:
                        idx = event.key - pygame.K_1
                        if not self.shop.select_bait(idx):
                            self.shop.buy_bait(idx)
                    elif event.key in [pygame.K_a, pygame.K_b, pygame.K_c, pygame.K_d]:
                        idx = event.key - pygame.K_a
                        if not self.shop.select_rod(idx):
                            self.shop.buy_rod(idx)

                elif self.state == GameState.PLAYING:
                    if event.key == pygame.K_ESCAPE:
                        self.reset_game_state()
                        self.state = GameState.MENU
                    elif event.key == pygame.K_s:
                        self.state = GameState.SHOP
                    elif event.key == pygame.K_SPACE:
                        if self.shop.has_bait():
                            rod = self.shop.get_current_rod()
                            self.casting.start_charging(rod.cast_power_bonus)
                            self.state = GameState.CASTING

                elif self.state == GameState.CASTING:
                    if event.key == pygame.K_SPACE:
                        self.casting.cast(self.player_x, self.player_y)
                        self.shop.use_bait()
                        self.state = GameState.WAITING
                        self.wait_timer = 0
                        self.create_splash(self.casting.bobber_x, WATER_TOP)

                elif self.state == GameState.WAITING:
                    if event.key == pygame.K_SPACE:
                        self.casting.reset()
                        self.state = GameState.PLAYING

                elif self.state == GameState.QTE:
                    if event.key in [pygame.K_j, pygame.K_k, pygame.K_l, pygame.K_SPACE]:
                        self.qte.handle_input(event.key)

                elif self.state == GameState.RESULT:
                    if event.key == pygame.K_ESCAPE or event.key == pygame.K_SPACE:
                        self.showing_result = False
                        self.qte.reset()
                        self.casting.reset()
                        self.current_fish = None
                        self.state = GameState.PLAYING
        return True

    def reset_game_state(self):
        self.casting.reset()
        self.qte.reset()
        self.current_fish = None
        self.showing_result = False
        self.wait_timer = 0

    def update(self):
        if self.state == GameState.PLAYING:
            self.weather.update()
            self.update_background_fish()

        elif self.state == GameState.CASTING:
            self.casting.update_charging()
            self.weather.update()

        elif self.state == GameState.WAITING:
            self.casting.update()
            self.weather.update()
            self.update_background_fish()

            if self.casting.state == "waiting":
                self.wait_timer += 1

                if self.wait_timer > 60:
                    bait = self.shop.get_current_bait()
                    weather_bonus = self.weather.get_bite_probability_bonus()
                    accuracy_bonus = self.casting.get_landing_accuracy()
                    base_chance = 0.008 * (1 + bait.bite_bonus + weather_bonus) * accuracy_bonus

                    if random.random() < base_chance:
                        depth_ratio = self.casting.get_depth_ratio()
                        rare_bonus = bait.rare_bonus + self.weather.get_rare_fish_bonus()
                        self.current_fish = self.fish_db.get_random_fish(depth_ratio, rare_bonus)

                        rod = self.shop.get_current_rod()
                        self.qte.start(self.current_fish, rod.qte_ease_bonus)
                        self.state = GameState.QTE
                        self.bite_animation_timer = 30

        elif self.state == GameState.QTE:
            self.qte.update()
            self.weather.update()
            if self.bite_animation_timer > 0:
                self.bite_animation_timer -= 1

            if not self.qte.active and self.qte.result is not None and not self.showing_result:
                self.showing_result = True
                if self.qte.result == "success":
                    self.shop.add_money(self.current_fish.base_score)
                self.state = GameState.RESULT

        elif self.state == GameState.RESULT:
            self.weather.update()

        elif self.state == GameState.SHOP:
            self.weather.update()

        self.update_splash()

    def update_background_fish(self):
        for fish in self.background_fish:
            fish['x'] += fish['speed'] * fish['direction']
            if fish['x'] < -50 or fish['x'] > SCREEN_WIDTH + 50:
                fish['direction'] *= -1
                fish['y'] = random.randint(WATER_TOP, WATER_BOTTOM)

    def create_splash(self, x, y):
        for _ in range(15):
            self.splash_particles.append({
                'x': x,
                'y': y,
                'vx': random.uniform(-3, 3),
                'vy': random.uniform(-5, -1),
                'life': 30
            })

    def update_splash(self):
        for p in self.splash_particles[:]:
            p['x'] += p['vx']
            p['y'] += p['vy']
            p['vy'] += 0.2
            p['life'] -= 1
            if p['life'] <= 0:
                self.splash_particles.remove(p)

    def draw(self):
        self.screen.fill(WHITE)

        if self.state == GameState.MENU:
            self.draw_menu()
        elif self.state == GameState.SHOP:
            self.shop.draw_shop(self.screen, self.font, self.large_font)
            self.draw_close_button()
        else:
            self.draw_scene()
            self.draw_close_button()

    def draw_close_button(self):
        button_size = 40
        button_x = SCREEN_WIDTH - button_size - 15
        button_y = 15

        mouse_pos = pygame.mouse.get_pos()
        is_hovered = (button_x <= mouse_pos[0] <= button_x + button_size and 
                      button_y <= mouse_pos[1] <= button_y + button_size)

        button_color = (200, 50, 50) if is_hovered else (150, 50, 50)
        pygame.draw.rect(self.screen, button_color, (button_x, button_y, button_size, button_size), border_radius=8)
        pygame.draw.rect(self.screen, WHITE, (button_x, button_y, button_size, button_size), 2, border_radius=8)

        close_text = self.font.render("×", True, WHITE)
        text_x = button_x + (button_size - close_text.get_width()) // 2
        text_y = button_y + (button_size - close_text.get_height()) // 2 - 3
        self.screen.blit(close_text, (text_x, text_y))

        self.close_button_rect = pygame.Rect(button_x, button_y, button_size, button_size)

    def draw_menu(self):
        pygame.draw.rect(self.screen, (100, 180, 255), (0, 0, SCREEN_WIDTH, SCREEN_HEIGHT))

        title = self.large_font.render("钓 鱼 大 师", True, (255, 215, 0))
        self.screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, 200))

        instructions = [
            "游戏说明:",
            "空格键 - 按住蓄力，松开抛竿",
            "力量槽绿色区域为最佳抛投位置",
            "等待鱼上钩后，按 J/K/L/空格 进行 QTE 收线",
            "保持力量槽在绿色区域才能成功钓到鱼",
            "S 键 - 打开商店",
            "ESC 键 - 返回菜单"
        ]

        for i, text in enumerate(instructions):
            text_surface = self.font.render(text, True, WHITE)
            self.screen.blit(text_surface, (SCREEN_WIDTH // 2 - text_surface.get_width() // 2, 300 + i * 40))

        button_width = 300
        button_height = 80
        button_x = SCREEN_WIDTH // 2 - button_width // 2
        button_y = 630

        mouse_pos = pygame.mouse.get_pos()
        is_hovered = (button_x <= mouse_pos[0] <= button_x + button_width and 
                      button_y <= mouse_pos[1] <= button_y + button_height)

        button_color = (0, 200, 0) if is_hovered else (0, 150, 0)
        pygame.draw.rect(self.screen, button_color, (button_x, button_y, button_width, button_height), border_radius=15)
        pygame.draw.rect(self.screen, WHITE, (button_x, button_y, button_width, button_height), 3, border_radius=15)

        self.menu_button_rect = pygame.Rect(button_x, button_y, button_width, button_height)

        start_text = self.large_font.render("开始游戏", True, WHITE)
        text_x = button_x + (button_width - start_text.get_width()) // 2
        text_y = button_y + (button_height - start_text.get_height()) // 2
        self.screen.blit(start_text, (text_x, text_y))

    def draw_scene(self):
        self.weather.draw(self.screen)

        pygame.draw.rect(self.screen, (0, 100, 180), (0, WATER_TOP, SCREEN_WIDTH, SCREEN_HEIGHT - WATER_TOP))

        for y in range(WATER_TOP, SCREEN_HEIGHT, 30):
            pygame.draw.line(self.screen, (0, 120, 200), (0, y), (SCREEN_WIDTH, y), 1)

        for fish in self.background_fish:
            self.draw_background_fish(fish)

        pygame.draw.rect(self.screen, (139, 69, 19), (0, WATER_BOTTOM, SCREEN_WIDTH, SCREEN_HEIGHT - WATER_BOTTOM))

        self.casting.draw_bobber(self.screen)

        self.draw_player()

        self.casting.draw_rod(self.screen, self.player_x, self.player_y)

        for p in self.splash_particles:
            alpha = int(255 * (p['life'] / 30))
            pygame.draw.circle(self.screen, (200, 230, 255, alpha), (int(p['x']), int(p['y'])), 3)

        if self.bite_animation_timer > 0 and self.state == GameState.QTE:
            shake = random.randint(-3, 3)
            bobber_rect = pygame.Rect(self.casting.bobber_x - 15 + shake, WATER_TOP - 10, 30, 20)
            pygame.draw.arc(self.screen, WHITE, bobber_rect, 0, 3.14, 2)

        self.draw_ui()

        if self.state == GameState.CASTING:
            self.casting.draw_power_bar(self.screen, 100, 650, self.font)

        if self.state == GameState.QTE:
            self.qte.draw(self.screen, self.font, self.large_font)

        if self.state == GameState.RESULT:
            self.qte.draw_result(self.screen, self.font, self.large_font)

    def draw_player(self):
        body_y = self.player_y - 40
        pygame.draw.circle(self.screen, (255, 220, 180), (self.player_x, body_y - 25), 20)
        pygame.draw.rect(self.screen, (50, 100, 200), (self.player_x - 20, body_y, 40, 50))
        pygame.draw.rect(self.screen, (100, 80, 60), (self.player_x - 18, body_y + 50, 15, 35))
        pygame.draw.rect(self.screen, (100, 80, 60), (self.player_x + 3, body_y + 50, 15, 35))

    def draw_background_fish(self, fish):
        body_w = fish['size'] * 1.5
        body_h = fish['size'] * 0.5
        pygame.draw.ellipse(self.screen, fish['color'], (fish['x'] - body_w / 2, fish['y'] - body_h / 2, body_w, body_h))
        tail_x = fish['x'] - body_w / 2 if fish['direction'] > 0 else fish['x'] + body_w / 2
        pygame.draw.polygon(self.screen, fish['color'], [
            (tail_x, fish['y']),
            (tail_x - fish['size'] * 0.3 * fish['direction'], fish['y'] - fish['size'] * 0.3),
            (tail_x - fish['size'] * 0.3 * fish['direction'], fish['y'] + fish['size'] * 0.3)
        ])

    def draw_ui(self):
        weather_text = self.font.render(f"天气: {self.weather.get_weather_name()}", True, WHITE)
        self.screen.blit(weather_text, (20, 20))

        self.shop.draw_inventory(self.screen, self.font)

        if self.state == GameState.PLAYING:
            hint = self.font.render("按住空格键蓄力抛竿 | S键打开商店 | ESC返回菜单", True, WHITE)
            self.screen.blit(hint, (20, SCREEN_HEIGHT - 40))
        elif self.state == GameState.CASTING:
            hint = self.font.render("松开空格键抛竿! 绿色区域最佳", True, YELLOW)
            self.screen.blit(hint, (20, SCREEN_HEIGHT - 40))
        elif self.state == GameState.WAITING:
            hint = self.font.render("等待鱼上钩... 按空格键收杆", True, WHITE)
            self.screen.blit(hint, (20, SCREEN_HEIGHT - 40))

if __name__ == "__main__":
    game = FishingGame()
    game.run()
