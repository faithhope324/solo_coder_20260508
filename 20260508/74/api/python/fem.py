import numpy as np
from scipy import sparse
from scipy.sparse.linalg import spsolve
from utils import triangle_area, gauss_legendre_triangle

EPS0 = 8.854187817e-12

def shape_function_derivatives(p1, p2, p3):
    x1, y1 = p1
    x2, y2 = p2
    x3, y3 = p3
    
    area = triangle_area(p1, p2, p3)
    if area < 1e-12:
        return None, None
    
    b = np.array([y2 - y3, y3 - y1, y1 - y2])
    c = np.array([x3 - x2, x1 - x3, x2 - x1])
    
    dN_dx = b / (2 * area)
    dN_dy = c / (2 * area)
    
    return dN_dx, dN_dy

def element_stiffness_matrix(p1, p2, p3, permittivity):
    dN_dx, dN_dy = shape_function_derivatives(p1, p2, p3)
    
    if dN_dx is None:
        return np.zeros((3, 3))
    
    area = triangle_area(p1, p2, p3)
    epsilon = EPS0 * permittivity
    
    Ke = epsilon * area * (
        np.outer(dN_dx, dN_dx) + np.outer(dN_dy, dN_dy)
    )
    
    return Ke

def assemble_system(nodes, elements, element_materials):
    n_nodes = len(nodes)
    n_elements = len(elements)
    
    rows = []
    cols = []
    data = []
    
    for e_idx, elem in enumerate(elements):
        i, j, k = elem
        p1 = (nodes[i][0], nodes[i][1])
        p2 = (nodes[j][0], nodes[j][1])
        p3 = (nodes[k][0], nodes[k][1])
        
        permittivity = element_materials[e_idx]['permittivity']
        Ke = element_stiffness_matrix(p1, p2, p3, permittivity)
        
        local_indices = [i, j, k]
        for a in range(3):
            for b in range(3):
                rows.append(local_indices[a])
                cols.append(local_indices[b])
                data.append(Ke[a, b])
    
    K = sparse.csr_matrix(
        (data, (rows, cols)), 
        shape=(n_nodes, n_nodes)
    )
    
    F = np.zeros(n_nodes)
    
    return K, F

def find_boundary_nodes(nodes, domain_size):
    width, height = domain_size['width'], domain_size['height']
    boundary_nodes = []
    
    tol = 1e-6
    
    for i, node in enumerate(nodes):
        x, y = node
        if (abs(x) < tol or abs(x - width) < tol or
            abs(y) < tol or abs(y - height) < tol):
            boundary_nodes.append(i)
    
    return boundary_nodes

def find_electrode_nodes(nodes, shapes):
    electrode_nodes = {}
    
    tol = 1e-3
    
    for shape in shapes:
        if not shape.get('isElectrode', False):
            continue
        
        bc = shape.get('boundaryCondition')
        if bc is None or bc.get('type') != 'dirichlet':
            continue
        
        potential = bc.get('value', 0)
        shape_type = shape['type']
        
        if shape_type == 'circle':
            cx, cy = shape['points'][0]['x'], shape['points'][0]['y']
            r = shape.get('radius', 0)
            
            for i, node in enumerate(nodes):
                x, y = node
                dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                if abs(dist - r) < tol:
                    electrode_nodes[i] = potential
        else:
            polygon = []
            if shape_type == 'rectangle':
                x1, y1 = shape['points'][0]['x'], shape['points'][0]['y']
                x2, y2 = shape['points'][1]['x'], shape['points'][1]['y']
                polygon = [
                    (min(x1, x2), min(y1, y2)),
                    (max(x1, x2), min(y1, y2)),
                    (max(x1, x2), max(y1, y2)),
                    (min(x1, x2), max(y1, y2))
                ]
            elif shape_type == 'polygon':
                polygon = [(p['x'], p['y']) for p in shape['points']]
            
            for i, node in enumerate(nodes):
                x, y = node
                for j in range(len(polygon)):
                    px, py = polygon[j]
                    nx, ny = polygon[(j + 1) % len(polygon)]
                    dist = point_to_line_distance((x, y), (px, py), (nx, ny))
                    if dist < tol:
                        electrode_nodes[i] = potential
                        break
    
    return electrode_nodes

def point_to_line_distance(point, line_start, line_end):
    x, y = point
    x1, y1 = line_start
    x2, y2 = line_end
    
    dx = x2 - x1
    dy = y2 - y1
    
    if dx == 0 and dy == 0:
        return np.sqrt((x - x1) ** 2 + (y - y1) ** 2)
    
    t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))
    
    proj_x = x1 + t * dx
    proj_y = y1 + t * dy
    
    return np.sqrt((x - proj_x) ** 2 + (y - proj_y) ** 2)

def apply_dirichlet_bc(K, F, nodes, shapes, boundary_conditions, domain_size):
    n_nodes = len(nodes)
    
    bc_nodes = {}
    
    electrode_nodes = find_electrode_nodes(nodes, shapes)
    bc_nodes.update(electrode_nodes)
    
    boundary_nodes = find_boundary_nodes(nodes, domain_size)
    for node_idx in boundary_nodes:
        if node_idx not in bc_nodes and len(boundary_conditions) > 0:
            bc_nodes[node_idx] = boundary_conditions[0].get('value', 0)
    
    penalty = 1e10
    
    for node_idx, value in bc_nodes.items():
        K += penalty * sparse.csr_matrix(
            ([penalty], ([node_idx], [node_idx])),
            shape=K.shape
        )
        F[node_idx] += penalty * value
    
    return K, F

def solve_linear_system(K, F):
    V = spsolve(K, F)
    return V

def compute_electric_field(nodes, elements, potential):
    n_nodes = len(nodes)
    Ex = np.zeros(n_nodes)
    Ey = np.zeros(n_nodes)
    count = np.zeros(n_nodes)
    
    for elem in elements:
        i, j, k = elem
        p1 = (nodes[i][0], nodes[i][1])
        p2 = (nodes[j][0], nodes[j][1])
        p3 = (nodes[k][0], nodes[k][1])
        
        dN_dx, dN_dy = shape_function_derivatives(p1, p2, p3)
        
        if dN_dx is None:
            continue
        
        V_i = potential[i]
        V_j = potential[j]
        V_k = potential[k]
        
        dV_dx = dN_dx[0] * V_i + dN_dx[1] * V_j + dN_dx[2] * V_k
        dV_dy = dN_dy[0] * V_i + dN_dy[1] * V_j + dN_dy[2] * V_k
        
        Ex_local = -dV_dx
        Ey_local = -dV_dy
        
        for idx in [i, j, k]:
            Ex[idx] += Ex_local
            Ey[idx] += Ey_local
            count[idx] += 1
    
    for i in range(n_nodes):
        if count[i] > 0:
            Ex[i] /= count[i]
            Ey[i] /= count[i]
    
    return list(zip(Ex.tolist(), Ey.tolist()))
