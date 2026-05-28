import numpy as np
from typing import Dict, List, Any
import math
from scipy.sparse import lil_matrix
from scipy.sparse.linalg import spsolve


class FEMSolver:
    def __init__(self):
        pass
    
    def generate_mesh(self, shapes: List[Dict], mesh_size: float):
        if len(shapes) == 1 and shapes[0]['type'] == 'circle':
            return self._generate_circle_mesh(shapes[0], mesh_size)
        elif len(shapes) == 1 and shapes[0]['type'] == 'rectangle':
            return self._generate_rectangle_mesh(shapes[0], mesh_size)
        else:
            return self._generate_combined_mesh(shapes, mesh_size)
    
    def _generate_rectangle_mesh(self, shape: Dict, mesh_size: float):
        x = shape['x']
        y = shape['y']
        w = shape.get('width', 1.0)
        h = shape.get('height', 1.0)
        
        nx = max(3, int(w / mesh_size))
        ny = max(3, int(h / mesh_size))
        
        points = []
        for i in range(ny + 1):
            for j in range(nx + 1):
                px = x + j * (w / nx)
                py = y + i * (h / ny)
                points.append([px, py])
        
        elements = []
        for i in range(ny):
            for j in range(nx):
                n1 = i * (nx + 1) + j
                n2 = n1 + 1
                n3 = n1 + (nx + 1)
                n4 = n3 + 1
                elements.append([n1, n2, n3])
                elements.append([n2, n4, n3])
        
        return np.array(points), elements
    
    def _generate_circle_mesh(self, shape: Dict, mesh_size: float):
        cx = shape.get('center_x', shape.get('x', 0.5))
        cy = shape.get('center_y', shape.get('y', 0.5))
        r = shape.get('radius', 0.5)
        
        n_angular = max(16, int(2 * math.pi * r / mesh_size))
        n_radial = max(3, int(r / mesh_size))
        
        n_angular = n_angular - (n_angular % 4)
        
        points = []
        ring_sizes = []
        
        points.append([cx, cy])
        ring_sizes.append(1)
        
        for rad in range(1, n_radial + 1):
            current_r = r * (rad / n_radial)
            pts_on_ring = n_angular
            for ang in range(pts_on_ring):
                theta = 2 * math.pi * ang / pts_on_ring
                px = cx + current_r * math.cos(theta)
                py = cy + current_r * math.sin(theta)
                points.append([px, py])
            ring_sizes.append(pts_on_ring)
        
        elements = []
        
        for i in range(n_angular):
            next_i = (i + 1) % n_angular
            elements.append([0, 1 + i, 1 + next_i])
        
        for ring in range(1, n_radial):
            inner_start = 1 + (ring - 1) * n_angular
            outer_start = 1 + ring * n_angular
            
            for i in range(n_angular):
                inner_i = inner_start + i
                inner_next = inner_start + (i + 1) % n_angular
                outer_i = outer_start + i
                outer_next = outer_start + (i + 1) % n_angular
                
                elements.append([inner_i, outer_i, inner_next])
                elements.append([inner_next, outer_i, outer_next])
        
        return np.array(points), elements
    
    def _generate_combined_mesh(self, shapes: List[Dict], mesh_size: float):
        all_points = []
        for shape in shapes:
            if shape['type'] == 'rectangle':
                x = shape['x']
                y = shape['y']
                w = shape.get('width', 1.0)
                h = shape.get('height', 1.0)
                
                nx = max(3, int(w / mesh_size))
                ny = max(3, int(h / mesh_size))
                
                for i in range(ny + 1):
                    for j in range(nx + 1):
                        px = x + j * (w / nx)
                        py = y + i * (h / ny)
                        all_points.append([px, py])
            elif shape['type'] == 'circle':
                cx = shape.get('center_x', shape.get('x', 0.5))
                cy = shape.get('center_y', shape.get('y', 0.5))
                r = shape.get('radius', 0.5)
                
                n_angular = max(16, int(2 * math.pi * r / mesh_size))
                for ang in range(n_angular):
                    theta = 2 * math.pi * ang / n_angular
                    px = cx + r * math.cos(theta)
                    py = cy + r * math.sin(theta)
                    all_points.append([px, py])
        
        points = np.array(all_points)
        if len(points) < 3:
            return points, []
            
        elements = self._triangulate_simple(points)
        return points, elements
    
    def _triangulate_simple(self, points: np.ndarray) -> List[List[int]]:
        elements = []
        n = len(points)
        if n < 3:
            return elements
            
        center = np.mean(points, axis=0)
        
        angles = np.arctan2(points[:, 1] - center[1], points[:, 0] - center[0])
        sorted_indices = np.argsort(angles)
        
        for i in range(len(sorted_indices) - 2):
            elements.append([
                sorted_indices[0],
                sorted_indices[i + 1],
                sorted_indices[i + 2]
            ])
            
        return elements
    
    def compute_stiffness_matrix(self, points: np.ndarray, elements: List[List[int]], 
                                  E: float, nu: float):
        n_nodes = len(points)
        n_dofs = 2 * n_nodes
        
        K = lil_matrix((n_dofs, n_dofs))
        
        D = (E / (1 - nu**2)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2]
        ])
        
        for elem in elements:
            elem_nodes = np.array(elem)
            x = points[elem_nodes, 0]
            y = points[elem_nodes, 1]
            
            A = self._triangle_area(x, y)
            if A < 1e-10:
                continue
                
            B = self._strain_displacement_matrix(x, y)
            k_elem = A * B.T @ D @ B
            
            for i in range(3):
                for j in range(3):
                    for di in range(2):
                        for dj in range(2):
                            row = 2 * elem_nodes[i] + di
                            col = 2 * elem_nodes[j] + dj
                            K[row, col] += k_elem[2 * i + di, 2 * j + dj]
        
        return K.tocsr()
    
    def _triangle_area(self, x: np.ndarray, y: np.ndarray) -> float:
        return 0.5 * abs((x[1] - x[0]) * (y[2] - y[0]) - (x[2] - x[0]) * (y[1] - y[0]))
    
    def _strain_displacement_matrix(self, x: np.ndarray, y: np.ndarray) -> np.ndarray:
        A = 2 * self._triangle_area(x, y)
        
        b = np.array([y[1] - y[2], y[2] - y[0], y[0] - y[1]])
        c = np.array([x[2] - x[1], x[0] - x[2], x[1] - x[0]])
        
        B = np.zeros((3, 6))
        for i in range(3):
            B[0, 2 * i] = b[i] / A
            B[1, 2 * i + 1] = c[i] / A
            B[2, 2 * i] = c[i] / A
            B[2, 2 * i + 1] = b[i] / A
        
        return B
    
    def apply_boundary_conditions(self, K, F: np.ndarray, points: np.ndarray,
                                   boundary_conditions: List[Dict]):
        n_nodes = len(points)
        n_dofs = 2 * n_nodes
        
        fixed_dofs = []
        
        for bc in boundary_conditions:
            if bc['type'] == 'fixed':
                location = bc.get('location', 'left')
                threshold = bc.get('value', 0.01)
                
                for i, (x, y) in enumerate(points):
                    if location == 'left' and abs(x) < threshold:
                        fixed_dofs.extend([2*i, 2*i+1])
                    elif location == 'right' and abs(x - 1.0) < threshold:
                        fixed_dofs.extend([2*i, 2*i+1])
                    elif location == 'top' and abs(y) < threshold:
                        fixed_dofs.extend([2*i, 2*i+1])
                    elif location == 'bottom' and abs(y - 1.0) < threshold:
                        fixed_dofs.extend([2*i, 2*i+1])
            
            elif bc['type'] == 'force':
                location = bc.get('location', 'right')
                value = bc.get('value', 1000.0)
                direction = bc.get('direction', 'x')
                threshold = bc.get('threshold', 0.01)
                
                for i, (x, y) in enumerate(points):
                    apply_force = False
                    if location == 'left' and abs(x) < threshold:
                        apply_force = True
                    elif location == 'right' and abs(x - 1.0) < threshold:
                        apply_force = True
                    elif location == 'top' and abs(y) < threshold:
                        apply_force = True
                    elif location == 'bottom' and abs(y - 1.0) < threshold:
                        apply_force = True
                    
                    if apply_force:
                        if direction == 'x':
                            F[2*i] += value
                        else:
                            F[2*i + 1] += value
        
        free_dofs = np.setdiff1d(np.arange(n_dofs), fixed_dofs)
        
        K_reduced = K[free_dofs][:, free_dofs]
        F_reduced = F[free_dofs]
        
        return K_reduced, F_reduced, free_dofs, n_dofs
    
    def compute_stress(self, points: np.ndarray, elements: List[List[int]],
                       displacement: np.ndarray, E: float, nu: float):
        D = (E / (1 - nu**2)) * np.array([
            [1, nu, 0],
            [nu, 1, 0],
            [0, 0, (1 - nu) / 2]
        ])
        
        element_stress = []
        for elem in elements:
            elem_nodes = np.array(elem)
            x = points[elem_nodes, 0]
            y = points[elem_nodes, 1]
            
            B = self._strain_displacement_matrix(x, y)
            
            u_elem = np.zeros(6)
            for i in range(3):
                u_elem[2*i] = displacement[2*elem_nodes[i]]
                u_elem[2*i + 1] = displacement[2*elem_nodes[i] + 1]
            
            stress = D @ B @ u_elem
            von_mises = np.sqrt(stress[0]**2 - stress[0]*stress[1] + stress[1]**2 + 3*stress[2]**2)
            element_stress.append(von_mises)
        
        node_stress = np.zeros(len(points))
        node_count = np.zeros(len(points))
        
        for i, elem in enumerate(elements):
            for node in elem:
                node_stress[node] += element_stress[i]
                node_count[node] += 1
        
        node_stress = np.where(node_count > 0, node_stress / node_count, 0)
        
        return node_stress.tolist()
    
    def solve(self, request_data: Dict) -> Dict:
        import threading
        
        class TimeoutError(Exception):
            pass
        
        shapes = request_data['shapes']
        boundary_conditions = request_data.get('boundary_conditions', [])
        material = request_data.get('material', {})
        mesh_size = request_data.get('mesh_size', 0.1)
        
        if mesh_size < 0.05:
            mesh_size = 0.05
        
        E = material.get('young_modulus', 210e9)
        nu = material.get('poisson_ratio', 0.3)
        
        points, elements = self.generate_mesh(shapes, mesh_size)
        
        if len(points) == 0 or len(elements) == 0:
            raise ValueError("Failed to generate mesh")
        
        if len(points) > 5000:
            raise ValueError(f"Too many nodes ({len(points)}). Please increase mesh size. Maximum allowed: 5000 nodes")
        
        result = [None]
        error = [None]
        
        def solve_worker():
            try:
                n_nodes = len(points)
                n_dofs = 2 * n_nodes
                
                K = self.compute_stiffness_matrix(points, elements, E, nu)
                F = np.zeros(n_dofs)
                
                K_reduced, F_reduced, free_dofs, n_dofs = self.apply_boundary_conditions(
                    K, F, points, boundary_conditions
                )
                
                if len(free_dofs) == 0:
                    error[0] = ValueError("No free degrees of freedom")
                    return
                
                u_reduced = spsolve(K_reduced, F_reduced)
                
                u = np.zeros(n_dofs)
                u[free_dofs] = u_reduced
                
                stress = self.compute_stress(points, elements, u, E, nu)
                
                displacement = []
                for i in range(n_nodes):
                    displacement.append([u[2*i], u[2*i + 1]])
                
                result[0] = {
                    'nodes': points.tolist(),
                    'elements': elements,
                    'stress': stress,
                    'displacement': displacement
                }
            except Exception as e:
                error[0] = e
        
        thread = threading.Thread(target=solve_worker)
        thread.daemon = True
        thread.start()
        thread.join(timeout=30)
        
        if thread.is_alive():
            raise ValueError("Calculation timed out after 30 seconds. Please increase mesh size.")
        
        if error[0] is not None:
            raise error[0]
        
        return result[0]
