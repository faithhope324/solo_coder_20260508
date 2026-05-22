import pygame

class CollisionSystem:
    def __init__(self):
        pass

    def check_rect_collision(self, rect1, rect2):
        return rect1.colliderect(rect2)

    def check_car_collision(self, player, enemies):
        if player.invincible:
            return []
        
        collisions = []
        player_rect = player.get_rect()
        
        for enemy in enemies:
            if player_rect.colliderect(enemy.get_rect()):
                collisions.append(enemy)
        
        return collisions

    def check_item_collision(self, player, items):
        player_rect = player.get_rect()
        collected = []
        
        for item in items:
            if player_rect.colliderect(item.get_rect()):
                collected.append(item)
        
        return collected

    def check_wall_collision(self, player, road_left, road_right):
        if player.x < road_left or player.x + player.width > road_right:
            return True
        return False

    def handle_item_collection(self, player, collected_items, score_manager):
        effects = []
        
        for item in collected_items:
            item_type = item.get_type()
            
            if item_type == 'fuel':
                player.add_fuel(30)
                effects.append(('fuel', 30))
                score_manager.add_score(50)
            
            elif item_type == 'speed':
                player.speed = min(player.speed + 1, player.max_speed)
                effects.append(('speed', 1))
                score_manager.add_score(100)
            
            elif item_type == 'shield':
                player.set_invincible(5000)
                effects.append(('shield', 5000))
                score_manager.add_score(150)
        
        return effects
