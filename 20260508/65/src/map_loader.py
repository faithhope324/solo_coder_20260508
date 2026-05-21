import os
import json
from typing import List, Tuple, Dict, Any
from src.constants import TILE_TYPES, TILE_SIZE, GRID_WIDTH, GRID_HEIGHT


class MapLoader:
    def __init__(self, maps_dir: str = "maps"):
        self.maps_dir = maps_dir
        self.tile_map: List[List[int]] = []
        self.players_spawn: List[Tuple[int, int]] = []
        self.enemies: List[Dict[str, Any]] = []
        self.exit_pos: Tuple[int, int] = None
        self.level_name: str = ""
        self.level_data: Dict[str, Any] = {}

    def load_map(self, filename: str) -> bool:
        filepath = os.path.join(self.maps_dir, filename)
        if not os.path.exists(filepath):
            print(f"Error: Map file '{filepath}' not found!")
            return False

        ext = os.path.splitext(filename)[1].lower()
        try:
            if ext == '.txt':
                return self._load_txt(filepath)
            elif ext == '.json':
                return self._load_json(filepath)
            else:
                print(f"Error: Unsupported map format '{ext}'")
                return False
        except Exception as e:
            print(f"Error loading map: {e}")
            return False

    def _load_txt(self, filepath: str) -> bool:
        self.tile_map = []
        self.players_spawn = []
        self.enemies = []
        self.exit_pos = None
        self.level_name = os.path.splitext(os.path.basename(filepath))[0]

        char_mapping = {
            '.': TILE_TYPES['EMPTY'],
            '#': TILE_TYPES['WALL'],
            'B': TILE_TYPES['BOX'],
            '1': TILE_TYPES['PLAYER1_SPAWN'],
            '2': TILE_TYPES['PLAYER2_SPAWN'],
            'E': TILE_TYPES['ENEMY_NORMAL'],
            'S': TILE_TYPES['ENEMY_STATIC'],
            'X': TILE_TYPES['EXIT'],
        }

        with open(filepath, 'r', encoding='utf-8') as f:
            lines = [line.rstrip('\n') for line in f.readlines()]

        metadata = {}
        map_lines = []
        parsing_map = False

        for line in lines:
            if line.startswith('NAME:'):
                self.level_name = line[5:].strip()
            elif line.startswith('TIME:'):
                metadata['time_limit'] = int(line[5:].strip())
            elif line.startswith('---'):
                parsing_map = True
                continue
            elif parsing_map and line:
                map_lines.append(line)

        for y, line in enumerate(map_lines):
            row = []
            for x, char in enumerate(line):
                tile_type = char_mapping.get(char, TILE_TYPES['EMPTY'])
                row.append(tile_type)

                if tile_type == TILE_TYPES['PLAYER1_SPAWN']:
                    self.players_spawn.insert(0, (x, y))
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['PLAYER2_SPAWN']:
                    self.players_spawn.append((x, y))
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['ENEMY_NORMAL']:
                    self.enemies.append({
                        'type': 'normal',
                        'x': x,
                        'y': y
                    })
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['ENEMY_STATIC']:
                    self.enemies.append({
                        'type': 'static',
                        'x': x,
                        'y': y
                    })
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['EXIT']:
                    self.exit_pos = (x, y)

            self.tile_map.append(row)

        self._pad_map()
        self.level_data = {
            'name': self.level_name,
            'grid_width': len(self.tile_map[0]) if self.tile_map else 0,
            'grid_height': len(self.tile_map),
            'metadata': metadata
        }
        return True

    def _load_json(self, filepath: str) -> bool:
        self.tile_map = []
        self.players_spawn = []
        self.enemies = []
        self.exit_pos = None

        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.level_name = data.get('name', os.path.splitext(os.path.basename(filepath))[0])
        grid_data = data.get('grid', [])
        self.level_data = data

        for y, row_data in enumerate(grid_data):
            row = []
            for x, cell in enumerate(row_data):
                tile_type = cell.get('type', TILE_TYPES['EMPTY'])
                row.append(tile_type)

                if tile_type == TILE_TYPES['PLAYER1_SPAWN']:
                    self.players_spawn.insert(0, (x, y))
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['PLAYER2_SPAWN']:
                    self.players_spawn.append((x, y))
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['ENEMY_NORMAL']:
                    self.enemies.append({
                        'type': 'normal',
                        'x': x,
                        'y': y,
                        'speed': cell.get('speed', None)
                    })
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['ENEMY_STATIC']:
                    self.enemies.append({
                        'type': 'static',
                        'x': x,
                        'y': y,
                        'fire_rate': cell.get('fire_rate', None)
                    })
                    row[-1] = TILE_TYPES['EMPTY']
                elif tile_type == TILE_TYPES['EXIT']:
                    self.exit_pos = (x, y)

            self.tile_map.append(row)

        self._pad_map()
        return True

    def _pad_map(self):
        current_height = len(self.tile_map)
        if current_height == 0:
            return

        current_width = len(self.tile_map[0])

        if current_width < GRID_WIDTH:
            for row in self.tile_map:
                row.extend([TILE_TYPES['WALL']] * (GRID_WIDTH - current_width))

        if current_height < GRID_HEIGHT:
            for _ in range(GRID_HEIGHT - current_height):
                self.tile_map.append([TILE_TYPES['WALL']] * GRID_WIDTH)

    def save_map(self, filename: str, tile_map: List[List[int]],
                 players_spawn: List[Tuple[int, int]] = None,
                 enemies: List[Dict[str, Any]] = None,
                 exit_pos: Tuple[int, int] = None,
                 metadata: Dict[str, Any] = None) -> bool:
        filepath = os.path.join(self.maps_dir, filename)
        ext = os.path.splitext(filename)[1].lower()

        try:
            if ext == '.txt':
                return self._save_txt(filepath, tile_map, players_spawn, enemies, exit_pos, metadata)
            elif ext == '.json':
                return self._save_json(filepath, tile_map, players_spawn, enemies, exit_pos, metadata)
            else:
                print(f"Error: Unsupported map format '{ext}'")
                return False
        except Exception as e:
            print(f"Error saving map: {e}")
            return False

    def _save_txt(self, filepath: str, tile_map: List[List[int]],
                  players_spawn: List[Tuple[int, int]],
                  enemies: List[Dict[str, Any]],
                  exit_pos: Tuple[int, int],
                  metadata: Dict[str, Any]) -> bool:
        reverse_mapping = {v: k for k, v in TILE_TYPES.items()}
        char_mapping = {
            TILE_TYPES['EMPTY']: '.',
            TILE_TYPES['WALL']: '#',
            TILE_TYPES['BOX']: 'B',
            TILE_TYPES['EXIT']: 'X',
        }

        grid = [[char_mapping.get(tile, '.') for tile in row] for row in tile_map]

        if players_spawn:
            if len(players_spawn) > 0:
                x, y = players_spawn[0]
                if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
                    grid[y][x] = '1'
            if len(players_spawn) > 1:
                x, y = players_spawn[1]
                if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
                    grid[y][x] = '2'

        if enemies:
            for enemy in enemies:
                x, y = enemy['x'], enemy['y']
                if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
                    grid[y][x] = 'E' if enemy['type'] == 'normal' else 'S'

        if exit_pos:
            x, y = exit_pos
            if 0 <= y < len(grid) and 0 <= x < len(grid[0]):
                grid[y][x] = 'X'

        with open(filepath, 'w', encoding='utf-8') as f:
            name = metadata.get('name', 'Unnamed') if metadata else 'Unnamed'
            f.write(f"NAME: {name}\n")
            if metadata and 'time_limit' in metadata:
                f.write(f"TIME: {metadata['time_limit']}\n")
            f.write("---\n")
            for row in grid:
                f.write(''.join(row) + '\n')

        return True

    def _save_json(self, filepath: str, tile_map: List[List[int]],
                   players_spawn: List[Tuple[int, int]],
                   enemies: List[Dict[str, Any]],
                   exit_pos: Tuple[int, int],
                   metadata: Dict[str, Any]) -> bool:
        grid_data = []
        for y, row in enumerate(tile_map):
            row_data = []
            for x, tile_type in enumerate(row):
                cell = {'type': tile_type}

                if players_spawn and (x, y) == players_spawn[0]:
                    cell['type'] = TILE_TYPES['PLAYER1_SPAWN']
                elif players_spawn and len(players_spawn) > 1 and (x, y) == players_spawn[1]:
                    cell['type'] = TILE_TYPES['PLAYER2_SPAWN']

                if enemies:
                    for enemy in enemies:
                        if enemy['x'] == x and enemy['y'] == y:
                            cell['type'] = TILE_TYPES['ENEMY_NORMAL'] if enemy['type'] == 'normal' else TILE_TYPES['ENEMY_STATIC']
                            if 'speed' in enemy:
                                cell['speed'] = enemy['speed']
                            if 'fire_rate' in enemy:
                                cell['fire_rate'] = enemy['fire_rate']

                if exit_pos and (x, y) == exit_pos:
                    cell['type'] = TILE_TYPES['EXIT']

                row_data.append(cell)
            grid_data.append(row_data)

        data = {
            'name': metadata.get('name', 'Unnamed') if metadata else 'Unnamed',
            'grid_width': len(tile_map[0]) if tile_map else 0,
            'grid_height': len(tile_map),
            'grid': grid_data
        }

        if metadata:
            data.update(metadata)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        return True

    def get_available_maps(self) -> List[str]:
        if not os.path.exists(self.maps_dir):
            return []
        return [f for f in os.listdir(self.maps_dir)
                if f.endswith('.txt') or f.endswith('.json')]

    def is_walkable(self, x: int, y: int) -> bool:
        if y < 0 or y >= len(self.tile_map) or x < 0 or x >= len(self.tile_map[0]):
            return False
        tile = self.tile_map[y][x]
        return tile == TILE_TYPES['EMPTY']

    def is_destructible(self, x: int, y: int) -> bool:
        if y < 0 or y >= len(self.tile_map) or x < 0 or x >= len(self.tile_map[0]):
            return False
        return self.tile_map[y][x] == TILE_TYPES['BOX']

    def destroy_tile(self, x: int, y: int) -> bool:
        if self.is_destructible(x, y):
            self.tile_map[y][x] = TILE_TYPES['EMPTY']
            return True
        return False
