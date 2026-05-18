from ursina import *
from game import MazeGame


app = Ursina()
window.title = '3D 迷宫探险'
window.borderless = False
window.fullscreen = False
window.exit_button.visible = True

game = None
menu_entities = []


def show_menu():
    global menu_entities
    clear_menu()

    camera.parent = camera
    camera.position = (0, 0, -20)
    camera.rotation = (0, 0, 0)
    mouse.locked = False

    bg = Entity(parent=camera.ui, model='quad', scale=(2, 2), color=color.dark_gray)
    menu_entities.append(bg)

    title = Text(
        text='3D 迷宫探险',
        position=(0, 0.3),
        origin=(0, 0),
        scale=4,
        color=color.gold
    )
    menu_entities.append(title)

    start_btn = Button(
        text='开始游戏',
        position=(0, 0.05),
        scale=(0.3, 0.1),
        color=color.azure,
        highlight_color=color.blue,
        on_click=start_game
    )
    menu_entities.append(start_btn)

    quit_btn = Button(
        text='退出游戏',
        position=(0, -0.1),
        scale=(0.3, 0.1),
        color=color.dark_gray,
        highlight_color=color.gray,
        on_click=application.quit
    )
    menu_entities.append(quit_btn)

    hint = Text(
        text='找到金色立方体即可获胜',
        position=(0, -0.3),
        origin=(0, 0),
        scale=1.2,
        color=color.light_gray
    )
    menu_entities.append(hint)


def clear_menu():
    global menu_entities
    for e in menu_entities:
        destroy(e)
    menu_entities = []


def start_game():
    global game
    clear_menu()
    scene.clear()
    game = MazeGame(size=21)


def update():
    if game:
        game.update()


def input(key):
    global game
    if key == 'escape' and game:
        if not game.won:
            mouse.locked = not mouse.locked


show_menu()
app.run()
