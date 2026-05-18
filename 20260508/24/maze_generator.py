import random


class MazeGenerator:
    def __init__(self, width, height):
        self.width = width
        self.height = height
        self.grid = [[1 for _ in range(width)] for _ in range(height)]

    def generate(self):
        self._carve(1, 1)
        return self.grid

    def _carve(self, x, y):
        directions = [(0, -2), (2, 0), (0, 2), (-2, 0)]
        random.shuffle(directions)

        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 < nx < self.width - 1 and 0 < ny < self.height - 1 and self.grid[ny][nx] == 1:
                self.grid[y + dy // 2][x + dx // 2] = 0
                self.grid[ny][nx] = 0
                self._carve(nx, ny)

    def get_open_spots(self):
        spots = []
        for y in range(self.height):
            for x in range(self.width):
                if self.grid[y][x] == 0:
                    spots.append((x, y))
        return spots
