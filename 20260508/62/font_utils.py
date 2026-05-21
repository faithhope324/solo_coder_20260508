import pygame

_font_cache = {}
_system_fonts = None


def _init_system_fonts():
    global _system_fonts
    if _system_fonts is None:
        _system_fonts = {name.lower() for name in pygame.font.get_fonts()}


def _find_font_name(candidates):
    _init_system_fonts()
    for name in candidates:
        if name.lower() in _system_fonts:
            return name
    return None


def get_font(size, bold=False):
    key = (size, bold)
    if key in _font_cache:
        return _font_cache[key]

    _init_system_fonts()

    latin_fonts = [
        'arial', 'arialms', 'arialunicodems',
        'microsoftsansserif', 'tahoma', 'verdana',
        'timesnewroman', 'couriernew', 'consolas',
        'segoeui', 'segoeuiblack', 'segoeuisemibold',
        'calibri', 'cambria', 'candara', 'corbel',
        'dejavusans', 'dejavuserif', 'liberationsans',
        'ubuntusans', 'notosans', 'sourcesanspro',
        'sansserif', 'serif', 'monospace',
    ]

    name = _find_font_name(latin_fonts)
    if name:
        font = pygame.font.SysFont(name, size, bold=bold)
        _font_cache[key] = font
        return font

    try:
        font = pygame.font.Font(None, size)
        if bold:
            font.set_bold(True)
        _font_cache[key] = font
        return font
    except Exception:
        font = pygame.font.SysFont(None, size, bold=bold)
        _font_cache[key] = font
        return font
