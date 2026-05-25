import numpy as np

def point_in_polygon(point, polygon):
    x, y = point
    n = len(polygon)
    inside = False
    p1x, p1y = polygon[0]
    for i in range(n + 1):
        p2x, p2y = polygon[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def point_in_circle(point, center, radius):
    dx = point[0] - center[0]
    dy = point[1] - center[1]
    return dx * dx + dy * dy <= radius * radius

def get_shape_polygon(shape):
    shape_type = shape['type']
    points = shape['points']
    
    if shape_type == 'rectangle':
        x1, y1 = points[0]['x'], points[0]['y']
        x2, y2 = points[1]['x'], points[1]['y']
        return [
            (min(x1, x2), min(y1, y2)),
            (max(x1, x2), min(y1, y2)),
            (max(x1, x2), max(y1, y2)),
            (min(x1, x2), max(y1, y2))
        ]
    elif shape_type == 'circle':
        cx, cy = points[0]['x'], points[0]['y']
        r = shape.get('radius', 0)
        theta = np.linspace(0, 2 * np.pi, 32)
        return [(cx + r * np.cos(t), cy + r * np.sin(t)) for t in theta]
    elif shape_type == 'polygon':
        return [(p['x'], p['y']) for p in points]
    return []

def is_point_in_shape(point, shape):
    shape_type = shape['type']
    x, y = point
    
    if shape_type == 'circle':
        cx, cy = shape['points'][0]['x'], shape['points'][0]['y']
        r = shape.get('radius', 0)
        return point_in_circle((x, y), (cx, cy), r)
    else:
        polygon = get_shape_polygon(shape)
        return point_in_polygon((x, y), polygon)

def get_shape_material(shape):
    return shape['material']

def triangle_area(p1, p2, p3):
    return abs((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1])) / 2.0

def gauss_legendre_triangle():
    points = np.array([
        [1.0 / 3.0, 1.0 / 3.0],
        [0.6, 0.2],
        [0.2, 0.6],
        [0.2, 0.2]
    ])
    weights = np.array([-27.0 / 48.0, 25.0 / 48.0, 25.0 / 48.0, 25.0 / 48.0])
    return points, weights
