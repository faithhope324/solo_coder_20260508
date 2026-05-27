import sys
import pygame

from score_manager import ScoreManager
from generator import Generator
from collision import check_collision, check_out_of_screen
from ui import Basket, UIManager

SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60
BG_COLOR = (240, 248, 255)

COIN_POINTS = 10
BOMB_PENALTY = 20

STATE_START = "start"
STATE_PLAYING = "playing"
STATE_GAME_OVER = "game_over"


def main():
    pygame.init()
    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("接金币游戏")
    clock = pygame.time.Clock()

    score_manager = ScoreManager()
    generator = Generator(SCREEN_WIDTH)
    basket = Basket(SCREEN_WIDTH, SCREEN_HEIGHT)
    ui = UIManager(SCREEN_WIDTH, SCREEN_HEIGHT)

    game_state = STATE_START

    running = True
    while running:
        current_time = pygame.time.get_ticks()
        events = pygame.event.get()

        for event in events:
            if event.type == pygame.QUIT:
                score_manager.save_high_score()
                running = False
                continue

            if game_state == STATE_START:
                if event.type == pygame.MOUSEBUTTONDOWN or (
                    event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE
                ):
                    game_state = STATE_PLAYING
                    score_manager.reset()
                    generator.reset()
                    basket.reset()

            elif game_state == STATE_GAME_OVER:
                if event.type == pygame.MOUSEBUTTONDOWN or (
                    event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE
                ):
                    game_state = STATE_PLAYING
                    score_manager.reset()
                    generator.reset()
                    basket.reset()

        if game_state == STATE_START:
            ui.draw_start_screen(screen, score_manager.high_score)

        elif game_state == STATE_PLAYING:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT] or keys[pygame.K_RIGHT] or keys[pygame.K_a] or keys[pygame.K_d]:
                basket.move_with_keys(keys)
            else:
                mouse_x, _ = pygame.mouse.get_pos()
                basket.move_with_mouse(mouse_x)

            speed_multiplier = score_manager.get_speed_multiplier()
            spawn_multiplier = score_manager.get_spawn_multiplier()
            generator.spawn_coin(current_time, spawn_multiplier)
            generator.spawn_bomb(current_time, spawn_multiplier)
            generator.update_all(speed_multiplier)

            for obj in generator.objects[:]:
                if check_collision(basket.rect, obj.rect):
                    if obj.type == "coin":
                        score_manager.add_score(COIN_POINTS)
                    else:
                        score_manager.subtract_score(BOMB_PENALTY)
                        score_manager.lose_life()
                    generator.remove_object(obj)
                elif check_out_of_screen(obj.rect, SCREEN_HEIGHT):
                    generator.remove_object(obj)

            generator.remove_out_of_screen(SCREEN_HEIGHT)

            if score_manager.is_game_over():
                score_manager.save_high_score()
                game_state = STATE_GAME_OVER

            screen.fill(BG_COLOR)
            generator.draw_all(screen)
            basket.draw(screen)
            ui.draw_game_screen(screen, score_manager)

        elif game_state == STATE_GAME_OVER:
            screen.fill(BG_COLOR)
            generator.draw_all(screen)
            basket.draw(screen)
            ui.draw_game_screen(screen, score_manager)
            ui.draw_game_over_screen(screen, score_manager)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
