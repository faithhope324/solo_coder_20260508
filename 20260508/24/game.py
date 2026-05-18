from ursina import *
from maze_generator import MazeGenerator
import random


class MazeGame:
    def __init__(self, size=21):
        self.size = size
        self.wall_height = 3
        self.walls = []
        self.won = False
        self.setup()

    def setup(self):
        camera.rotation = (0, 0, 0)
        camera.fov = 90

        maze_gen = MazeGenerator(self.size, self.size)
        self.maze = maze_gen.generate()

        self._build_maze()
        self._place_goal(maze_gen.get_open_spots())
        self._setup_player()
        self._setup_controls()

        self.win_text = Text(
            text='恭喜！你找到了目标！',
            position=(0, 0.15),
            origin=(0, 0),
            scale=3,
            color=color.yellow,
            visible=False
        )

        self.restart_btn = Button(
            text='重新开始',
            position=(0, -0.05),
            scale=(0.3, 0.1),
            color=color.azure,
            highlight_color=color.blue,
            visible=False,
            on_click=self._restart_game
        )

        self.menu_btn = Button(
            text='返回菜单',
            position=(0, -0.2),
            scale=(0.3, 0.1),
            color=color.dark_gray,
            highlight_color=color.gray,
            visible=False,
            on_click=self._back_to_menu
        )

        self.hint_text = Text(
            text='WASD 移动 | 鼠标控制视角 | ESC 暂停',
            position=(-0.85, -0.45),
            origin=(-0, -0),
            scale=1,
            color=color.white
        )

    def _build_maze(self):
        for y in range(self.size):
            for x in range(self.size):
                if self.maze[y][x] == 1:
                    wall = Entity(
                        model='cube',
                        color=color.dark_gray,
                        position=(x * 2, self.wall_height / 2, y * 2),
                        scale=(2, self.wall_height, 2),
                        collider='box'
                    )
                    self.walls.append(wall)

        ground = Entity(
            model='plane',
            color=color.light_gray,
            position=(self.size, 0, self.size),
            scale=(self.size * 2, 1, self.size * 2),
            collider='box'
        )

    def _place_goal(self, open_spots):
        far_spots = [s for s in open_spots if s[0] > 10 or s[1] > 10]
        if far_spots:
            gx, gy = random.choice(far_spots)
        else:
            gx, gy = random.choice(open_spots)

        self.goal = Entity(
            model='cube',
            color=color.gold,
            position=(gx * 2, 1, gy * 2),
            scale=(1.5, 1.5, 1.5),
            collider='box'
        )
        self.goal_rotator = Entity(parent=self.goal, y=1)

    def _setup_player(self):
        self.player = Entity(position=(2, 1.6, 2), collider='box', scale=(0.5, 1.6, 0.5))
        camera.parent = self.player
        camera.position = (0, 0, 0)
        camera.rotation = (0, 0, 0)
        mouse.locked = True
        self.player.speed = 4

    def _setup_controls(self):
        self.cursor = Entity(parent=camera.ui, model='quad', color=color.white, scale=.008, rotation_z=45)

    def update(self):
        if self.won:
            return

        self.goal_rotator.rotation_y += time.dt * 100

        if mouse.locked:
            self.player.rotation_y += mouse.velocity[0] * 40
            camera.rotation_x -= mouse.velocity[1] * 40
            camera.rotation_x = clamp(camera.rotation_x, -60, 60)

        move_dir = Vec3(
            held_keys['d'] - held_keys['a'],
            0,
            held_keys['s'] - held_keys['w']
        ).normalized()

        if move_dir.length() > 0:
            rotation = self.player.rotation_y
            move_dir = move_dir.rotate((0, rotation, 0))
            original_pos = self.player.position
            self.player.position += move_dir * self.player.speed * time.dt

            hit_info = self.player.intersects()
            if hit_info.hit:
                for entity in hit_info.entities:
                    if entity in self.walls:
                        self.player.position = original_pos
                        break

        if self.player.intersects(self.goal).hit:
            self.won = True
            self.win_text.visible = True
            self.restart_btn.visible = True
            self.menu_btn.visible = True
            mouse.locked = False

    def _restart_game(self):
        self.win_text.visible = False
        self.restart_btn.visible = False
        self.menu_btn.visible = False
        for wall in self.walls:
            destroy(wall)
        self.walls = []
        destroy(self.goal)
        destroy(self.cursor)
        destroy(self.player)
        self.won = False
        self.setup()

    def _back_to_menu(self):
        import main
        self.win_text.visible = False
        self.restart_btn.visible = False
        self.menu_btn.visible = False
        destroy(self.cursor)
        camera.parent = camera
        for wall in self.walls:
            destroy(wall)
        destroy(self.goal)
        destroy(self.player)
        main.game = None
        main.show_menu()
