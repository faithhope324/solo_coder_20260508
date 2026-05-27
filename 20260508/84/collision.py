import pygame


def check_collision(basket_rect, falling_object_rect):
    return basket_rect.colliderect(falling_object_rect)


def check_out_of_screen(falling_object_rect, screen_height):
    return falling_object_rect.top > screen_height
