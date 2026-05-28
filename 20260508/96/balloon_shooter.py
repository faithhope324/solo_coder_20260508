import pygame
import random
import math

pygame.init()

SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("打气球射击游戏")

WHITE = (255, 255, 255)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
GOLD = (255, 215, 0)
BLACK = (0, 0, 0)
SKY_BLUE = (135, 206, 235)

class BalloonGenerator:
    def __init__(self):
        self.balloons = []
        self.spawn_timer = 0
        self.spawn_interval = 60
        self.golden_timer = 0
        self.golden_interval = 600

    def spawn_balloon(self, is_golden=False):
        x = random.randint(50, SCREEN_WIDTH - 50)
        y = SCREEN_HEIGHT + 50
        speed = random.uniform(1, 3)
        radius = random.randint(25, 40)
        
        if is_golden:
            color = GOLD
            points = 0
            special_type = random.choice(['time', 'bomb'])
        else:
            if random.random() < 0.5:
                color = RED
                points = 10
            else:
                color = BLUE
                points = 5
            special_type = None
        
        balloon = {
            'x': x,
            'y': y,
            'speed': speed,
            'radius': radius,
            'color': color,
            'points': points,
            'special_type': special_type,
            'is_golden': is_golden
        }
        self.balloons.append(balloon)

    def update(self):
        self.spawn_timer += 1
        self.golden_timer += 1

        if self.spawn_timer >= self.spawn_interval:
            self.spawn_balloon()
            self.spawn_timer = 0

        if self.golden_timer >= self.golden_interval:
            self.spawn_balloon(is_golden=True)
            self.golden_timer = 0

        for balloon in self.balloons[:]:
            balloon['y'] -= balloon['speed']
            if balloon['y'] < -50:
                self.balloons.remove(balloon)

    def draw(self, surface):
        for balloon in self.balloons:
            pygame.draw.circle(surface, balloon['color'], (int(balloon['x']), int(balloon['y'])), balloon['radius'])
            pygame.draw.circle(surface, BLACK, (int(balloon['x']), int(balloon['y'])), balloon['radius'], 2)
            pygame.draw.line(surface, BLACK, (int(balloon['x']), int(balloon['y']) + balloon['radius']), (int(balloon['x']), int(balloon['y']) + balloon['radius'] + 15), 2)
            
            if balloon['is_golden']:
                font = pygame.font.Font(None, 24)
                if balloon['special_type'] == 'time':
                    text = font.render('+T', True, BLACK)
                else:
                    text = font.render('💥', True, BLACK)
                surface.blit(text, (balloon['x'] - 10, balloon['y'] - 8))

class MouseShooter:
    def __init__(self):
        self.crosshair_pos = (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2)

    def update(self):
        self.crosshair_pos = pygame.mouse.get_pos()

    def draw(self, surface):
        x, y = self.crosshair_pos
        pygame.draw.line(surface, RED, (x - 15, y), (x + 15, y), 2)
        pygame.draw.line(surface, RED, (x, y - 15), (x, y + 15), 2)
        pygame.draw.circle(surface, RED, (x, y), 20, 2)

    def check_hit(self, balloons):
        x, y = self.crosshair_pos
        hit_balloons = []
        for balloon in balloons:
            distance = math.sqrt((x - balloon['x']) ** 2 + (y - balloon['y']) ** 2)
            if distance <= balloon['radius']:
                hit_balloons.append(balloon)
        return hit_balloons

class Timer:
    def __init__(self, start_time=60):
        self.time_left = start_time
        self.font = pygame.font.Font(None, 48)
        self.last_tick = pygame.time.get_ticks()

    def update(self):
        current_tick = pygame.time.get_ticks()
        if current_tick - self.last_tick >= 1000:
            self.time_left -= 1
            self.last_tick = current_tick
        return self.time_left > 0

    def add_time(self, seconds):
        self.time_left += seconds

    def draw(self, surface):
        time_text = self.font.render(f"时间: {self.time_left}秒", True, BLACK)
        surface.blit(time_text, (SCREEN_WIDTH - 200, 20))

    def is_time_up(self):
        return self.time_left <= 0

class SpecialItems:
    def __init__(self, balloon_generator, timer):
        self.balloon_generator = balloon_generator
        self.timer = timer
        self.bomb_active = False
        self.bomb_timer = 0

    def activate_special(self, balloon):
        if balloon['special_type'] == 'time':
            self.timer.add_time(10)
            return "time"
        elif balloon['special_type'] == 'bomb':
            self.bomb_active = True
            self.bomb_timer = 30
            return "bomb"
        return None

    def update(self):
        if self.bomb_active:
            self.bomb_timer -= 1
            if self.bomb_timer <= 0:
                self.bomb_active = False
                popped_count = len(self.balloon_generator.balloons)
                self.balloon_generator.balloons = []
                return popped_count
        return 0

    def draw(self, surface):
        if self.bomb_active:
            font = pygame.font.Font(None, 72)
            text = font.render("💥 炸弹！", True, RED)
            surface.blit(text, (SCREEN_WIDTH // 2 - 100, SCREEN_HEIGHT // 2 - 50))

class ScoreManager:
    def __init__(self):
        self.score = 0
        self.font = pygame.font.Font(None, 48)
        self.combo = 0
        self.last_hit_time = 0

    def add_points(self, points):
        current_time = pygame.time.get_ticks()
        if current_time - self.last_hit_time < 1000:
            self.combo += 1
        else:
            self.combo = 1
        
        self.score += points * self.combo
        self.last_hit_time = current_time

    def reset_combo(self):
        self.combo = 0

    def draw(self, surface):
        score_text = self.font.render(f"分数: {self.score}", True, BLACK)
        surface.blit(score_text, (20, 20))
        
        if self.combo > 1:
            combo_font = pygame.font.Font(None, 36)
            combo_text = combo_font.render(f"连击 x{self.combo}", True, RED)
            surface.blit(combo_text, (20, 70))

    def draw_final_score(self, surface):
        surface.fill(SKY_BLUE)
        font_large = pygame.font.Font(None, 72)
        font_medium = pygame.font.Font(None, 48)
        
        title_text = font_large.render("游戏结束！", True, RED)
        score_text = font_medium.render(f"最终得分: {self.score}", True, BLACK)
        restart_text = font_medium.render("按 R 重新开始", True, BLUE)
        
        surface.blit(title_text, (SCREEN_WIDTH // 2 - 150, SCREEN_HEIGHT // 2 - 100))
        surface.blit(score_text, (SCREEN_WIDTH // 2 - 120, SCREEN_HEIGHT // 2))
        surface.blit(restart_text, (SCREEN_WIDTH // 2 - 130, SCREEN_HEIGHT // 2 + 80))

def main():
    clock = pygame.time.Clock()
    running = True
    game_over = False

    balloon_generator = BalloonGenerator()
    mouse_shooter = MouseShooter()
    timer = Timer(60)
    score_manager = ScoreManager()
    special_items = SpecialItems(balloon_generator, timer)

    pygame.mouse.set_visible(False)

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            
            if event.type == pygame.MOUSEBUTTONDOWN and not game_over:
                hit_balloons = mouse_shooter.check_hit(balloon_generator.balloons)
                for balloon in hit_balloons:
                    if balloon['is_golden']:
                        special_type = special_items.activate_special(balloon)
                        if special_type == 'time':
                            score_manager.add_points(20)
                        elif special_type == 'bomb':
                            score_manager.add_points(15)
                    else:
                        score_manager.add_points(balloon['points'])
                    balloon_generator.balloons.remove(balloon)
            
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_r and game_over:
                    game_over = False
                    balloon_generator = BalloonGenerator()
                    timer = Timer(60)
                    score_manager = ScoreManager()
                    special_items = SpecialItems(balloon_generator, timer)

        if not game_over:
            mouse_shooter.update()
            balloon_generator.update()
            
            if not timer.update():
                game_over = True
            
            bomb_points = special_items.update()
            if bomb_points > 0:
                score_manager.add_points(bomb_points * 2)

        screen.fill(SKY_BLUE)

        if not game_over:
            balloon_generator.draw(screen)
            mouse_shooter.draw(screen)
            timer.draw(screen)
            score_manager.draw(screen)
            special_items.draw(screen)
        else:
            score_manager.draw_final_score(screen)

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()

if __name__ == "__main__":
    main()
