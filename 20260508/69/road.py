import pygame
import random

class Road:
    def __init__(self, screen_width, screen_height):
        self.screen_width = screen_width
        self.screen_height = screen_height
        self.road_width = 400
        self.road_left = (screen_width - self.road_width) // 2
        self.road_right = self.road_left + self.road_width
        
        self.grass_color = (34, 139, 34)
        self.road_color = (50, 50, 50)
        self.road_edge_color = (255, 255, 255)
        self.line_color = (255, 255, 255)
        
        self.line_y = 0
        self.line_gap = 80
        self.line_length = 40
        self.line_width = 6
        
        self.obstacles = []
        self.obstacle_timer = 0
        self.obstacle_interval = 8000
        
        self.trees = []
        self.generate_trees()
        
        self.scroll_offset = 0

    def generate_trees(self):
        for i in range(20):
            side = random.choice(['left', 'right'])
            if side == 'left':
                x = random.randint(20, self.road_left - 60)
            else:
                x = random.randint(self.road_right + 20, self.screen_width - 60)
            y = random.randint(0, self.screen_height)
            self.trees.append({'x': x, 'y': y, 'size': random.randint(25, 40)})

    def spawn_obstacle(self, speed_multiplier):
        obstacle_types = ['cone', 'barrier', 'oil']
        obstacle_type = random.choice(obstacle_types)
        
        x = random.randint(self.road_left + 20, self.road_right - 50)
        y = -50
        
        if obstacle_type == 'cone':
            width, height = 25, 35
        elif obstacle_type == 'barrier':
            width, height = 60, 25
        else:
            width, height = 45, 45
        
        self.obstacles.append({
            'x': x, 'y': y, 'width': width, 'height': height,
            'type': obstacle_type, 'rect': pygame.Rect(x, y, width, height)
        })

    def update(self, dt, speed_multiplier):
        scroll_speed = 5 * speed_multiplier
        self.scroll_offset = (self.scroll_offset + scroll_speed * dt / 16) % (self.line_gap + self.line_length)
        
        self.obstacle_timer += dt
        adjusted_interval = max(self.obstacle_interval / speed_multiplier, 3000)
        
        if self.obstacle_timer >= adjusted_interval:
            self.spawn_obstacle(speed_multiplier)
            self.obstacle_timer = 0

        for obstacle in self.obstacles:
            obstacle['y'] += scroll_speed * dt / 16
            obstacle['rect'].y = obstacle['y']
        
        self.obstacles = [obs for obs in self.obstacles if obs['y'] < self.screen_height + 50]

        for tree in self.trees:
            tree['y'] += scroll_speed * 0.8 * dt / 16
            if tree['y'] > self.screen_height + 50:
                tree['y'] = -50
                side = random.choice(['left', 'right'])
                if side == 'left':
                    tree['x'] = random.randint(20, self.road_left - 60)
                else:
                    tree['x'] = random.randint(self.road_right + 20, self.screen_width - 60)
                tree['size'] = random.randint(25, 40)

    def draw(self, screen):
        screen.fill(self.grass_color)
        
        for tree in self.trees:
            pygame.draw.circle(screen, (0, 100, 0), (tree['x'], tree['y']), tree['size'])
            pygame.draw.rect(screen, (101, 67, 33), 
                           (tree['x'] - 4, tree['y'] + tree['size'] - 5, 8, 15))

        pygame.draw.rect(screen, self.road_color, 
                        (self.road_left, 0, self.road_width, self.screen_height))
        
        pygame.draw.rect(screen, self.road_edge_color, 
                        (self.road_left - 5, 0, 5, self.screen_height))
        pygame.draw.rect(screen, self.road_edge_color, 
                        (self.road_right, 0, 5, self.screen_height))
        
        lane_count = 3
        lane_width = self.road_width // lane_count
        for lane in range(1, lane_count):
            x = self.road_left + lane * lane_width
            for y in range(-self.line_gap, self.screen_height + self.line_gap, self.line_gap + self.line_length):
                actual_y = y + self.scroll_offset
                pygame.draw.rect(screen, self.line_color, 
                                (x - self.line_width // 2, actual_y, 
                                 self.line_width, self.line_length))
        
        for obstacle in self.obstacles:
            if obstacle['type'] == 'cone':
                pygame.draw.polygon(screen, (255, 140, 0), [
                    (obstacle['x'] + obstacle['width'] // 2, obstacle['y']),
                    (obstacle['x'], obstacle['y'] + obstacle['height']),
                    (obstacle['x'] + obstacle['width'], obstacle['y'] + obstacle['height'])
                ])
                pygame.draw.rect(screen, (255, 255, 255), 
                               (obstacle['x'] + 5, obstacle['y'] + 15, obstacle['width'] - 10, 5))
            
            elif obstacle['type'] == 'barrier':
                for i in range(0, obstacle['width'], 10):
                    color = (255, 0, 0) if (i // 10) % 2 == 0 else (255, 255, 255)
                    pygame.draw.rect(screen, color, 
                                   (obstacle['x'] + i, obstacle['y'], 10, obstacle['height']))
            
            elif obstacle['type'] == 'oil':
                pygame.draw.ellipse(screen, (20, 20, 20), 
                                  (obstacle['x'], obstacle['y'], obstacle['width'], obstacle['height']))

    def get_obstacles(self):
        return self.obstacles

    def check_obstacle_collision(self, player_rect, player):
        if player.invincible:
            return []
        
        collisions = []
        for obstacle in self.obstacles:
            if player_rect.colliderect(obstacle['rect']):
                collisions.append(obstacle['type'])
        
        return collisions

    def get_road_bounds(self):
        return self.road_left, self.road_right

    def reset(self):
        self.obstacles = []
        self.obstacle_timer = 0
        self.scroll_offset = 0
