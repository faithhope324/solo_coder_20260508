import pygame
import sys
import os
from player import Player
from enemy import EnemySpawner
from item import ItemSystem
from collision import CollisionSystem
from score_manager import ScoreManager
from road import Road

class Button:
    def __init__(self, x, y, width, height, text, font, color=(0, 200, 0), hover_color=(0, 255, 0), text_color=(255, 255, 255)):
        self.rect = pygame.Rect(x, y, width, height)
        self.text = text
        self.font = font
        self.color = color
        self.hover_color = hover_color
        self.text_color = text_color
        self.is_hovered = False

    def update(self, mouse_pos):
        self.is_hovered = self.rect.collidepoint(mouse_pos)

    def draw(self, screen):
        current_color = self.hover_color if self.is_hovered else self.color
        pygame.draw.rect(screen, current_color, self.rect, border_radius=10)
        pygame.draw.rect(screen, (255, 255, 255), self.rect, 2, border_radius=10)
        
        text_surface = self.font.render(self.text, True, self.text_color)
        text_rect = text_surface.get_rect(center=self.rect.center)
        screen.blit(text_surface, text_rect)

    def is_clicked(self, mouse_pos, mouse_pressed):
        return self.rect.collidepoint(mouse_pos) and mouse_pressed

class Game:
    def __init__(self):
        pygame.init()
        pygame.font.init()
        
        self.SCREEN_WIDTH = 800
        self.SCREEN_HEIGHT = 600
        self.FPS = 60
        
        self.screen = pygame.display.set_mode((self.SCREEN_WIDTH, self.SCREEN_HEIGHT))
        pygame.display.set_caption("赛车竞速 - Highway Racer")
        self.clock = pygame.time.Clock()
        
        fonts_dir = r'C:\Windows\Fonts'
        font_candidates = [
            os.path.join(fonts_dir, 'msyh.ttc'),
            os.path.join(fonts_dir, 'msyhbd.ttc'),
            os.path.join(fonts_dir, 'simhei.ttf'),
            os.path.join(fonts_dir, 'simsun.ttc'),
            os.path.join(fonts_dir, 'kaiti.ttf'),
            os.path.join(fonts_dir, 'fangsong.ttf'),
        ]
        
        font_path = None
        for path in font_candidates:
            if os.path.exists(path):
                font_path = path
                break
        
        if font_path and os.path.exists(font_path):
            try:
                self.font_large = pygame.font.Font(font_path, 64)
                self.font_medium = pygame.font.Font(font_path, 36)
                self.font_small = pygame.font.Font(font_path, 24)
                self.font_button = pygame.font.Font(font_path, 32)
                self.font_large.set_bold(True)
                self.font_medium.set_bold(True)
                self.font_button.set_bold(True)
            except:
                self.font_large = pygame.font.SysFont(None, 64, bold=True)
                self.font_medium = pygame.font.SysFont(None, 36, bold=True)
                self.font_small = pygame.font.SysFont(None, 24)
                self.font_button = pygame.font.SysFont(None, 32, bold=True)
        else:
            self.font_large = pygame.font.SysFont(None, 64, bold=True)
            self.font_medium = pygame.font.SysFont(None, 36, bold=True)
            self.font_small = pygame.font.SysFont(None, 24)
            self.font_button = pygame.font.SysFont(None, 32, bold=True)
        
        self.STATE_MENU = 'menu'
        self.STATE_PLAYING = 'playing'
        self.STATE_GAMEOVER = 'gameover'
        self.state = self.STATE_MENU
        
        self.road = Road(self.SCREEN_WIDTH, self.SCREEN_HEIGHT)
        road_left, road_right = self.road.get_road_bounds()
        
        player_x = road_left + (road_right - road_left) // 2 - 20
        player_y = self.SCREEN_HEIGHT - 120
        self.player = Player(player_x, player_y, 40, 70)
        
        self.enemy_spawner = EnemySpawner(road_left, road_right, self.SCREEN_WIDTH, self.SCREEN_HEIGHT)
        self.item_system = ItemSystem(road_left, road_right, self.SCREEN_WIDTH, self.SCREEN_HEIGHT)
        self.collision_system = CollisionSystem()
        self.score_manager = ScoreManager()
        
        self.effect_messages = []
        self.screen_shake = 0
        self.new_high_score = False
        self.game_over_reason = ""
        
        button_width = 250
        button_height = 60
        button_x = (self.SCREEN_WIDTH - button_width) // 2
        
        self.start_button = Button(
            button_x, 360, button_width, button_height,
            '开始游戏', self.font_button
        )
        
        self.restart_button = Button(
            button_x, 440, button_width, button_height,
            '重新开始', self.font_button
        )
        
        self.quit_button = Button(
            button_x, 520, button_width, button_height,
            '退出游戏', self.font_button,
            color=(200, 0, 0), hover_color=(255, 0, 0)
        )
        
    def draw_hud(self):
        score_text = self.font_small.render(f'分数: {self.score_manager.get_score()}', True, (255, 255, 255))
        self.screen.blit(score_text, (20, 20))
        
        high_score_text = self.font_small.render(f'最高分: {self.score_manager.get_high_score()}', True, (255, 255, 0))
        self.screen.blit(high_score_text, (20, 50))
        
        distance_text = self.font_small.render(f'距离: {self.score_manager.get_distance()}m', True, (255, 255, 255))
        self.screen.blit(distance_text, (20, 80))
        
        speed_text = self.font_small.render(f'速度: x{self.score_manager.get_speed_multiplier():.2f}', True, (0, 255, 0))
        self.screen.blit(speed_text, (20, 110))
        
        fuel_label = self.font_small.render('燃油:', True, (255, 255, 255))
        self.screen.blit(fuel_label, (self.SCREEN_WIDTH - 180, 20))
        
        fuel_bg = pygame.Rect(self.SCREEN_WIDTH - 180, 50, 160, 25)
        pygame.draw.rect(self.screen, (100, 100, 100), fuel_bg, border_radius=5)
        
        fuel_width = int(160 * (self.player.fuel / self.player.max_fuel))
        fuel_color = (0, 255, 0) if self.player.fuel > 30 else (255, 0, 0)
        fuel_rect = pygame.Rect(self.SCREEN_WIDTH - 180, 50, fuel_width, 25)
        pygame.draw.rect(self.screen, fuel_color, fuel_rect, border_radius=5)
        
        if self.player.invincible:
            shield_text = self.font_small.render('🛡️ 无敌中', True, (148, 0, 211))
            self.screen.blit(shield_text, (self.SCREEN_WIDTH - 180, 85))
        
        current_time = pygame.time.get_ticks()
        self.effect_messages = [msg for msg in self.effect_messages if current_time - msg[1] < 1500]
        for i, (msg, start_time) in enumerate(self.effect_messages):
            alpha = max(0, 255 - (current_time - start_time) // 6)
            effect_text = self.font_small.render(msg, True, (0, 255, 255))
            effect_text.set_alpha(alpha)
            self.screen.blit(effect_text, (self.SCREEN_WIDTH // 2 - 50, 50 + i * 30))

    def draw_menu(self):
        self.screen.fill((20, 20, 40))
        
        title = self.font_large.render('赛车竞速', True, (255, 100, 0))
        title_rect = title.get_rect(center=(self.SCREEN_WIDTH // 2, 120))
        self.screen.blit(title, title_rect)
        
        subtitle = self.font_medium.render('Highway Racer', True, (100, 200, 255))
        subtitle_rect = subtitle.get_rect(center=(self.SCREEN_WIDTH // 2, 180))
        self.screen.blit(subtitle, subtitle_rect)
        
        high_score = self.score_manager.get_high_score()
        hs_text = self.font_medium.render(f'最高分: {high_score}', True, (255, 255, 0))
        hs_rect = hs_text.get_rect(center=(self.SCREEN_WIDTH // 2, 250))
        self.screen.blit(hs_text, hs_rect)
        
        self.start_button.draw(self.screen)
        
        or_text = self.font_small.render('或按 空格键 开始', True, (200, 200, 200))
        or_rect = or_text.get_rect(center=(self.SCREEN_WIDTH // 2, 440))
        self.screen.blit(or_text, or_rect)
        
        controls_title = self.font_small.render('操作说明:', True, (255, 255, 255))
        controls_rect = controls_title.get_rect(center=(self.SCREEN_WIDTH // 2, 490))
        self.screen.blit(controls_title, controls_rect)
        
        controls = [
            '← → 或 A D : 左右移动',
            '↑ ↓ 或 W S : 前后移动',
            '收集黄色燃料补充燃油',
            '蓝色闪电提升速度',
            '紫色护盾获得无敌'
        ]
        
        for i, control in enumerate(controls):
            ctrl_text = self.font_small.render(control, True, (200, 200, 200))
            ctrl_rect = ctrl_text.get_rect(center=(self.SCREEN_WIDTH // 2, 520 + i * 22))
            self.screen.blit(ctrl_text, ctrl_rect)

    def draw_gameover(self):
        overlay = pygame.Surface((self.SCREEN_WIDTH, self.SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 200))
        self.screen.blit(overlay, (0, 0))
        
        panel_rect = pygame.Rect(150, 80, 500, 440)
        pygame.draw.rect(self.screen, (40, 40, 60), panel_rect, border_radius=20)
        pygame.draw.rect(self.screen, (255, 100, 0), panel_rect, 3, border_radius=20)
        
        game_over_text = self.font_large.render('游戏结束', True, (255, 0, 0))
        game_over_rect = game_over_text.get_rect(center=(self.SCREEN_WIDTH // 2, 140))
        self.screen.blit(game_over_text, game_over_rect)
        
        if hasattr(self, 'game_over_reason') and self.game_over_reason:
            reason_text = self.font_medium.render(self.game_over_reason, True, (255, 200, 0))
            reason_rect = reason_text.get_rect(center=(self.SCREEN_WIDTH // 2, 200))
            self.screen.blit(reason_text, reason_rect)
        
        if self.new_high_score:
            new_hs_text = self.font_medium.render('🎉 新纪录! 🎉', True, (255, 215, 0))
            new_hs_rect = new_hs_text.get_rect(center=(self.SCREEN_WIDTH // 2, 250))
            self.screen.blit(new_hs_text, new_hs_rect)
        
        y_offset = 290 if self.new_high_score else 250
        if hasattr(self, 'game_over_reason') and self.game_over_reason:
            y_offset += 30
        
        score_text = self.font_medium.render(f'最终得分: {self.score_manager.get_score()}', True, (255, 255, 255))
        score_rect = score_text.get_rect(center=(self.SCREEN_WIDTH // 2, y_offset))
        self.screen.blit(score_text, score_rect)
        
        distance_text = self.font_medium.render(f'行驶距离: {self.score_manager.get_distance()}m', True, (255, 255, 255))
        distance_rect = distance_text.get_rect(center=(self.SCREEN_WIDTH // 2, y_offset + 50))
        self.screen.blit(distance_text, distance_rect)
        
        hs_text = self.font_medium.render(f'最高分: {self.score_manager.get_high_score()}', True, (255, 255, 0))
        hs_rect = hs_text.get_rect(center=(self.SCREEN_WIDTH // 2, y_offset + 100))
        self.screen.blit(hs_text, hs_rect)
        
        self.restart_button.draw(self.screen)
        self.quit_button.draw(self.screen)
        
        or_text = self.font_small.render('或按 空格键 重新开始, ESC 返回主菜单', True, (200, 200, 200))
        or_rect = or_text.get_rect(center=(self.SCREEN_WIDTH // 2, 600 - 30))
        self.screen.blit(or_text, or_rect)

    def add_effect_message(self, message):
        self.effect_messages.append((message, pygame.time.get_ticks()))

    def trigger_screen_shake(self, intensity):
        self.screen_shake = intensity

    def reset_game(self):
        self.player.x = (self.SCREEN_WIDTH - 400) // 2 + 200 - 20
        self.player.y = self.SCREEN_HEIGHT - 120
        self.player.fuel = 100
        self.player.speed = 5
        self.player.invincible = False
        self.player.invincible_timer = 0
        self.player.rect.x = self.player.x
        self.player.rect.y = self.player.y
        
        self.enemy_spawner.reset()
        self.item_system.reset()
        self.score_manager.reset()
        self.road.reset()
        
        self.effect_messages = []
        self.screen_shake = 0
        self.new_high_score = False

    def check_game_over(self):
        if self.player.fuel <= 0:
            return True, "燃油耗尽!"
        
        car_collisions = self.collision_system.check_car_collision(self.player, self.enemy_spawner.get_enemies())
        if car_collisions:
            return True, "撞车了!"
        
        obstacle_collisions = self.road.check_obstacle_collision(self.player.get_rect(), self.player)
        if 'cone' in obstacle_collisions or 'barrier' in obstacle_collisions:
            return True, "撞到障碍物!"
        
        return False, ""

    def run(self):
        running = True
        game_over_reason = ""
        
        try:
            while running:
                dt = self.clock.tick(self.FPS)
                
                shake_x = 0
                shake_y = 0
                if self.screen_shake > 0:
                    import random
                    shake_x = random.randint(-self.screen_shake, self.screen_shake)
                    shake_y = random.randint(-self.screen_shake, self.screen_shake)
                    self.screen_shake = max(0, self.screen_shake - dt * 0.02)
                
                mouse_pos = pygame.mouse.get_pos()
                
                for event in pygame.event.get():
                    if event.type == pygame.QUIT:
                        running = False
                    
                    if event.type == pygame.KEYDOWN:
                        if event.key == pygame.K_ESCAPE:
                            if self.state == self.STATE_PLAYING:
                                self.state = self.STATE_MENU
                            elif self.state == self.STATE_GAMEOVER:
                                self.state = self.STATE_MENU
                            else:
                                running = False
                        
                        if event.key == pygame.K_SPACE:
                            if self.state == self.STATE_MENU:
                                self.reset_game()
                                self.state = self.STATE_PLAYING
                            elif self.state == self.STATE_GAMEOVER:
                                self.reset_game()
                                self.state = self.STATE_PLAYING
                    
                    if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
                        if self.state == self.STATE_MENU:
                            if self.start_button.rect.collidepoint(mouse_pos):
                                self.reset_game()
                                self.state = self.STATE_PLAYING
                        elif self.state == self.STATE_GAMEOVER:
                            if self.restart_button.rect.collidepoint(mouse_pos):
                                self.reset_game()
                                self.state = self.STATE_PLAYING
                            elif self.quit_button.rect.collidepoint(mouse_pos):
                                self.state = self.STATE_MENU
                
                self.screen.fill((0, 0, 0))
                
                if self.state == self.STATE_MENU:
                    self.start_button.update(mouse_pos)
                    self.draw_menu()
                
                elif self.state == self.STATE_PLAYING:
                    keys = pygame.key.get_pressed()
                    road_left, road_right = self.road.get_road_bounds()
                    self.player.move(keys, self.SCREEN_WIDTH, road_left, road_right)
                    
                    speed_multiplier = self.score_manager.get_speed_multiplier()
                    
                    self.player.update(dt)
                    self.score_manager.update(dt)
                    self.road.update(dt, speed_multiplier)
                    self.enemy_spawner.update(dt, speed_multiplier)
                    self.item_system.update(dt, speed_multiplier)
                    
                    collected_items = self.item_system.check_collision(self.player.get_rect())
                    if collected_items:
                        effects = self.collision_system.handle_item_collection(self.player, collected_items, self.score_manager)
                        for effect_type, value in effects:
                            if effect_type == 'fuel':
                                self.add_effect_message('燃油 +30!')
                            elif effect_type == 'speed':
                                self.add_effect_message('速度提升!')
                            elif effect_type == 'shield':
                                self.add_effect_message('无敌护盾!')
                    
                    obstacle_collisions = self.road.check_obstacle_collision(self.player.get_rect(), self.player)
                    if 'oil' in obstacle_collisions:
                        self.player.speed = max(self.player.speed - 0.5, 2)
                        self.add_effect_message('打滑! 减速!')
                        self.trigger_screen_shake(5)
                    
                    game_over, reason = self.check_game_over()
                    if game_over:
                        game_over_reason = reason
                        self.new_high_score = self.score_manager.save_high_score()
                        self.trigger_screen_shake(15)
                        self.add_effect_message(reason)
                        self.state = self.STATE_GAMEOVER
                    
                    temp_surface = pygame.Surface((self.SCREEN_WIDTH, self.SCREEN_HEIGHT))
                    self.road.draw(temp_surface)
                    self.enemy_spawner.draw(temp_surface)
                    self.item_system.draw(temp_surface)
                    self.player.draw(temp_surface)
                    
                    self.screen.blit(temp_surface, (shake_x, shake_y))
                    self.draw_hud()
                
                elif self.state == self.STATE_GAMEOVER:
                    self.restart_button.update(mouse_pos)
                    self.quit_button.update(mouse_pos)
                    
                    self.road.draw(self.screen)
                    self.enemy_spawner.draw(self.screen)
                    self.item_system.draw(self.screen)
                    self.player.draw(self.screen)
                    self.draw_hud()
                    self.draw_gameover()
                
                pygame.display.flip()
        
        except Exception as e:
            print(f"游戏发生错误: {e}")
            import traceback
            traceback.print_exc()
        
        finally:
            pygame.quit()
            sys.exit()

if __name__ == '__main__':
    game = Game()
    game.run()
