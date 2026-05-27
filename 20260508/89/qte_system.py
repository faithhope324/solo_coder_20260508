import random
from config import *

class QTESystem:
    def __init__(self):
        self.active = False
        self.current_fish = None
        self.qte_keys = [pygame.K_j, pygame.K_k, pygame.K_l, pygame.K_SPACE]
        self.qte_key_names = ['J', 'K', 'L', '空格']
        self.current_key_index = 0
        self.required_keys = []
        self.tension = 50
        self.max_tension = 100
        self.min_tension = 0
        self.tension_increase = 8
        self.tension_decay = 0.3
        self.success_count = 0
        self.required_success = 5
        self.timer = 0
        self.max_time = 300
        self.qte_speed = 1.0
        self.tension_bar_width = 30
        self.tension_bar_height = 200
        self.green_zone_start = 30
        self.green_zone_end = 70
        self.fish_pull_timer = 0
        self.fish_pull_interval = 30
        self.result = None

    def start(self, fish, qte_ease_bonus=0):
        self.active = True
        self.current_fish = fish
        self.tension = 50
        self.success_count = 0
        self.required_success = fish.qte_count
        self.qte_speed = fish.qte_speed * (1 - qte_ease_bonus * 0.3)
        self.timer = 0
        self.result = None
        self.green_zone_start = 30 - qte_ease_bonus * 10
        self.green_zone_end = 70 + qte_ease_bonus * 10
        self.generate_keys()

    def generate_keys(self):
        self.required_keys = random.choices(self.qte_keys, k=self.required_success)
        self.current_key_index = 0

    def handle_input(self, key):
        if not self.active:
            return

        if self.current_key_index < len(self.required_keys):
            if key == self.required_keys[self.current_key_index]:
                self.success_count += 1
                self.current_key_index += 1
                self.tension = min(self.max_tension, self.tension + self.tension_increase)

                if self.success_count >= self.required_success:
                    if self.is_in_green_zone():
                        self.result = "success"
                    else:
                        self.result = "escape"
                    self.active = False
            else:
                self.tension = max(self.min_tension, self.tension - 15)

    def update(self):
        if not self.active:
            return

        self.timer += 1
        self.tension = max(self.min_tension, self.tension - self.tension_decay * self.qte_speed)

        self.fish_pull_timer += 1
        if self.fish_pull_timer >= self.fish_pull_interval / self.qte_speed:
            self.fish_pull_timer = 0
            pull_amount = random.randint(3, 8) * self.qte_speed
            self.tension = max(self.min_tension, self.tension - pull_amount)

        if self.tension <= self.min_tension:
            self.result = "escape"
            self.active = False

        if self.timer >= self.max_time:
            self.result = "timeout"
            self.active = False

    def is_in_green_zone(self):
        return self.green_zone_start <= self.tension <= self.green_zone_end

    def reset(self):
        self.active = False
        self.current_fish = None
        self.tension = 50
        self.success_count = 0
        self.timer = 0
        self.result = None

    def draw(self, screen, font, large_font):
        if not self.active:
            return

        panel_x = SCREEN_WIDTH // 2 - 300
        panel_y = 50
        panel_w = 600
        panel_h = 300

        pygame.draw.rect(screen, (30, 30, 50, 200), (panel_x, panel_y, panel_w, panel_h), border_radius=20)
        pygame.draw.rect(screen, WHITE, (panel_x, panel_y, panel_w, panel_h), 3, border_radius=20)

        title = large_font.render(f"钓到了 {self.current_fish.name}!", True, YELLOW)
        screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, panel_y + 20))

        bar_x = panel_x + 50
        bar_y = panel_y + 80
        pygame.draw.rect(screen, GRAY, (bar_x, bar_y, self.tension_bar_width, self.tension_bar_height))
        pygame.draw.rect(screen, RED, (bar_x, bar_y, self.tension_bar_width, self.tension_bar_height * (self.green_zone_start / 100)))
        pygame.draw.rect(screen, GREEN, (
            bar_x,
            bar_y + self.tension_bar_height * (self.green_zone_start / 100),
            self.tension_bar_width,
            self.tension_bar_height * ((self.green_zone_end - self.green_zone_start) / 100)
        ))
        pygame.draw.rect(screen, RED, (
            bar_x,
            bar_y + self.tension_bar_height * (self.green_zone_end / 100),
            self.tension_bar_width,
            self.tension_bar_height * ((100 - self.green_zone_end) / 100)
        ))

        indicator_y = bar_y + self.tension_bar_height - (self.tension / 100) * self.tension_bar_height
        pygame.draw.line(screen, WHITE, (bar_x - 10, indicator_y), (bar_x + self.tension_bar_width + 10, indicator_y), 4)

        pygame.draw.rect(screen, WHITE, (bar_x, bar_y, self.tension_bar_width, self.tension_bar_height), 2)

        tension_text = font.render("力量槽", True, WHITE)
        screen.blit(tension_text, (bar_x - 10, bar_y - 30))

        keys_x = panel_x + 150
        keys_y = panel_y + 100
        for i, key in enumerate(self.required_keys):
            if i < self.current_key_index:
                color = GREEN
            elif i == self.current_key_index:
                color = YELLOW
            else:
                color = GRAY

            key_name = self.qte_key_names[self.qte_keys.index(key)]
            key_text = large_font.render(key_name, True, color)
            screen.blit(key_text, (keys_x + i * 70, keys_y))

        if self.current_key_index < len(self.required_keys):
            current_key_name = self.qte_key_names[self.qte_keys.index(self.required_keys[self.current_key_index])]
            hint_text = font.render(f"快按 {current_key_name}!", True, WHITE)
            screen.blit(hint_text, (keys_x, keys_y + 80))

        progress_text = font.render(f"进度: {self.success_count}/{self.required_success}", True, WHITE)
        screen.blit(progress_text, (keys_x, keys_y + 120))

        time_left = max(0, (self.max_time - self.timer) // 60)
        time_text = font.render(f"时间: {time_left}秒", True, WHITE)
        screen.blit(time_text, (keys_x, keys_y + 150))

    def draw_result(self, screen, font, large_font):
        if self.result is None:
            return

        panel_x = SCREEN_WIDTH // 2 - 250
        panel_y = SCREEN_HEIGHT // 2 - 150
        panel_w = 500
        panel_h = 300

        pygame.draw.rect(screen, (30, 30, 50, 230), (panel_x, panel_y, panel_w, panel_h), border_radius=20)
        pygame.draw.rect(screen, WHITE, (panel_x, panel_y, panel_w, panel_h), 3, border_radius=20)

        if self.result == "success":
            title = large_font.render("钓鱼成功!", True, GREEN)
            score_text = font.render(f"获得 {self.current_fish.base_score} 金币!", True, YELLOW)
            screen.blit(score_text, (SCREEN_WIDTH // 2 - score_text.get_width() // 2, panel_y + 130))
        elif self.result == "escape":
            title = large_font.render("鱼跑掉了!", True, RED)
        else:
            title = large_font.render("时间到!", True, ORANGE)

        screen.blit(title, (SCREEN_WIDTH // 2 - title.get_width() // 2, panel_y + 50))

        hint = font.render("按任意键继续...", True, WHITE)
        screen.blit(hint, (SCREEN_WIDTH // 2 - hint.get_width() // 2, panel_y + 200))
