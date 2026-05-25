import numpy as np
from scipy.spatial import Delaunay
from utils import is_point_in_shape, get_shape_polygon, point_in_polygon

def generate_boundary_points(domain_size, density):
    width, height = domain_size['width'], domain_size['height']
    n_points = max(10, int(density * 2))
    
    boundary_points = []
    
    for i in np.linspace(0, width, n_points):
        boundary_points.append([i, 0])
        boundary_points.append([i, height])
    
    for i in np.linspace(0, height, n_points):
        boundary_points.append([0, i])
        boundary_points.append([width, i])
    
    return np.array(boundary_points)

def generate_internal_points(domain_size, density):
    width, height = domain_size['width'], domain_size['height']
    spacing = 1.0 / density
    
    x_coords = np.arange(spacing, width, spacing)
    y_coords = np.arange(spacing, height, spacing)
    
    points = []
    for x in x_coords:
        for y in y_coords:
            points.append([x, y])
    
    return np.array(points)

def generate_shape_boundary_points(shapes, density):
    all_points = []
    
    for shape in shapes:
        shape_type = shape['type']
        
        if shape_type == 'circle':
            cx, cy = shape['points'][0]['x'], shape['points'][0]['y']
            r = shape.get('radius', 0)
            n_points = max(16, int(density * r * 2))
            theta = np.linspace(0, 2 * np.pi, n_points, endpoint=False)
            for t in theta:
                all_points.append([cx + r * np.cos(t), cy + r * np.sin(t)])
        else:
            polygon = get_shape_polygon(shape)
            n_points_per_edge = max(8, int(density * 2))
            for i in range(len(polygon)):
                p1 = polygon[i]
                p2 = polygon[(i + 1) % len(polygon)]
                for t in np.linspace(0, 1, n_points_per_edge, endpoint=False):
                    x = p1[0] + t * (p2[0] - p1[0])
                    y = p1[1] + t * (p2[1] - p1[1])
                    all_points.append([x, y])
    
    return np.array(all_points) if all_points else np.empty((0, 2))

def filter_points(points, shapes, domain_size):
    width, height = domain_size['width'], domain_size['height']
    
    valid_mask = (points[:, 0] >= 0) & (points[:, 0] <= width) & \
                 (points[:, 1] >= 0) & (points[:, 1] <= height)
    
    return points[valid_mask]

def generate_mesh(shapes, config):
    density = config.get('meshDensity', 10)
    domain_size = config['domainSize']
    
    boundary_points = generate_boundary_points(domain_size, density)
    internal_points = generate_internal_points(domain_size, density)
    shape_boundary_points = generate_shape_boundary_points(shapes, density)
    
    all_points = []
    
    if len(boundary_points) > 0:
        all_points.append(boundary_points)
    if len(internal_points) > 0:
        all_points.append(internal_points)
    if len(shape_boundary_points) > 0:
        all_points.append(shape_boundary_points)
    
    if not all_points:
        raise ValueError("No points generated for mesh")
    
    all_points = np.vstack(all_points)
    all_points = filter_points(all_points, shapes, domain_size)
    
    all_points = np.unique(np.round(all_points, decimals=6), axis=0)
    
    if len(all_points) < 3:
        raise ValueError("Insufficient points for Delaunay triangulation")
    
    tri = Delaunay(all_points)
    
    elements = tri.simplices
    nodes = all_points.tolist()
    
    elements = filter_elements(nodes, elements, shapes, domain_size)
    
    return nodes, elements

def filter_elements(nodes, elements, shapes, domain_size):
    valid_elements = []
    width, height = domain_size['width'], domain_size['height']
    
    for elem in elements:
        p1 = nodes[elem[0]]
        p2 = nodes[elem[1]]
        p3 = nodes[elem[2]]
        
        cx = (p1[0] + p2[0] + p3[0]) / 3.0
        cy = (p1[1] + p2[1] + p3[1]) / 3.0
        
        if cx < 0 or cx > width or cy < 0 or cy > height:
            continue
        
        area = abs((p2[0] - p1[0]) * (p3[1] - p1[1]) - (p3[0] - p1[0]) * (p2[1] - p1[1])) / 2.0
        if area < 1e-10:
            continue
        
        valid_elements.append(elem.tolist())
    
    return valid_elements

def assign_materials(nodes, elements, shapes):
    material_list = []
    
    for elem in elements:
        p1 = nodes[elem[0]]
        p2 = nodes[elem[1]]
        p3 = nodes[elem[2]]
        
        cx = (p1[0] + p2[0] + p3[0]) / 3.0
        cy = (p1[1] + p2[1] + p3[1]) / 3.0
        
        assigned_material = None
        for shape in shapes:
            if is_point_in_shape((cx, cy), shape):
                assigned_material = shape['material']
                break
        
        if assigned_material is None:
            assigned_material = {
                'name': 'Air',
                'permittivity': 1.0,
                'conductivity': 0.0
            }
        
        material_list.append(assigned_material)
    
    return material_list
