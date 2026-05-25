import sys
import json
import time
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mesh import generate_mesh, assign_materials
from fem import assemble_system, apply_dirichlet_bc, solve_linear_system, compute_electric_field

def solve_electrostatic(request_data):
    start_time = time.time()
    
    shapes = request_data['shapes']
    boundary_conditions = request_data.get('boundaryConditions', [])
    config = request_data['config']
    
    if len(shapes) == 0:
        default_electrode_1 = {
            'id': 'default_e1',
            'type': 'rectangle',
            'name': 'Anode',
            'points': [{'x': 2, 'y': 4}, {'x': 8, 'y': 6}],
            'material': {'name': 'Copper', 'permittivity': 1.0, 'conductivity': 5.96e7},
            'isElectrode': True,
            'boundaryCondition': {'type': 'dirichlet', 'value': 100}
        }
        default_electrode_2 = {
            'id': 'default_e2',
            'type': 'rectangle',
            'name': 'Cathode',
            'points': [{'x': 2, 'y': 0}, {'x': 8, 'y': 2}],
            'material': {'name': 'Copper', 'permittivity': 1.0, 'conductivity': 5.96e7},
            'isElectrode': True,
            'boundaryCondition': {'type': 'dirichlet', 'value': 0}
        }
        shapes = [default_electrode_1, default_electrode_2]
    
    nodes, elements = generate_mesh(shapes, config)
    
    element_materials = assign_materials(nodes, elements, shapes)
    
    K, F = assemble_system(nodes, elements, element_materials)
    
    K, F = apply_dirichlet_bc(K, F, nodes, shapes, boundary_conditions, config['domainSize'])
    
    potential = solve_linear_system(K, F)
    
    electric_field = compute_electric_field(nodes, elements, potential)
    
    solve_time = (time.time() - start_time) * 1000
    
    result = {
        'nodes': [{'x': n[0], 'y': n[1]} for n in nodes],
        'elements': elements,
        'potential': potential.tolist(),
        'electricField': [{'x': ef[0], 'y': ef[1]} for ef in electric_field],
        'meshStats': {
            'nodeCount': len(nodes),
            'elementCount': len(elements)
        },
        'solveTime': solve_time
    }
    
    return result

if __name__ == '__main__':
    try:
        input_data = json.load(sys.stdin)
        result = solve_electrostatic(input_data)
        print(json.dumps({'success': True, 'data': result}))
    except Exception as e:
        print(json.dumps({'success': False, 'error': str(e)}), file=sys.stderr)
        sys.exit(1)
