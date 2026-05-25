import numpy as np
from .fdtd_solver import ElasticFDTD2D
from .source import SourceManager, ReceiverArray


class SimulationManager:
    def __init__(self):
        self.solver = None
        self.config = None
        self.is_running = False
        self.frames = []
        self.receiver_data = {}
        self.dt = None
    
    def configure(self, config):
        self.config = config
        
        nx = config.get('nx', 200)
        nz = config.get('nz', 200)
        dx = config.get('dx', 5.0)
        dz = config.get('dz', 5.0)
        vp = config.get('vp', 3000.0)
        vs = config.get('vs', 1732.0)
        rho = config.get('rho', 2500.0)
        pml_width = config.get('pml_width', 20)
        
        dt = 0.6 * min(dx, dz) / (vp * np.sqrt(2))
        self.dt = dt
        
        self.solver = ElasticFDTD2D(
            nx=nx, nz=nz, dx=dx, dz=dz, dt=dt,
            vp=vp, vs=vs, rho=rho, pml_width=pml_width
        )
        
        source_config = config.get('source', {})
        source_type = source_config.get('type', 'ricker')
        f0 = source_config.get('frequency', 20.0)
        amplitude = source_config.get('amplitude', 1e6)
        src_x = source_config.get('x', 100)
        src_z = source_config.get('z', 100)
        
        t0 = 1.5 / f0
        source_func = SourceManager.create_source(
            source_type, f0, t0=t0, amplitude=amplitude
        )
        self.solver.set_source(src_x, src_z, source_func, source_type='velocity')
        
        receivers_config = config.get('receivers', [])
        for rec in receivers_config:
            self.solver.add_receiver(rec['x'], rec['z'], rec['name'])
        
        self.frames = []
        self.receiver_data = {}
        
        return {
            'dt': dt,
            'nx': nx,
            'nz': nz,
            'dx': dx,
            'dz': dz,
            'vp': vp,
            'vs': vs
        }
    
    def create_receiver_array(self, array_config):
        array_type = array_config.get('type', 'line')
        
        if array_type == 'line':
            return ReceiverArray.create_line_array(
                array_config['start_x'], array_config['start_z'],
                array_config['end_x'], array_config['end_z'],
                array_config['num_receivers'],
                array_config.get('prefix', 'REC')
            )
        elif array_type == 'grid':
            return ReceiverArray.create_grid_array(
                array_config['x_start'], array_config['x_end'], array_config['x_step'],
                array_config['z_start'], array_config['z_end'], array_config['z_step'],
                array_config.get('prefix', 'REC')
            )
        else:
            raise ValueError(f"Unknown array type: {array_type}")
    
    def run_step(self, num_steps=10):
        if not self.solver:
            raise RuntimeError("Simulation not configured")
        
        for _ in range(num_steps):
            self.solver.step()
        
        wavefield = self.solver.get_wavefield()
        self.frames.append(wavefield)
        
        receiver_data = self.solver.get_all_receiver_data()
        self.receiver_data = receiver_data
        
        return {
            'wavefield': wavefield.tolist(),
            'receiver_data': {k: v.tolist() for k, v in receiver_data.items()},
            'step': self.solver.current_step,
            'time': self.solver.current_step * self.dt
        }
    
    def run_full(self, nsteps, frame_interval=10):
        if not self.solver:
            raise RuntimeError("Simulation not configured")
        
        frames = []
        for i in range(nsteps):
            self.solver.step()
            if i % frame_interval == 0:
                frames.append({
                    'step': i,
                    'time': i * self.dt,
                    'wavefield': self.solver.get_wavefield().tolist()
                })
        
        receiver_data = self.solver.get_all_receiver_data()
        self.receiver_data = receiver_data
        
        return {
            'frames': frames,
            'receiver_data': {k: v.tolist() for k, v in receiver_data.items()},
            'total_steps': nsteps,
            'total_time': nsteps * self.dt
        }
    
    def get_frame(self, frame_idx):
        if frame_idx < 0 or frame_idx >= len(self.frames):
            return None
        return self.frames[frame_idx].tolist()
    
    def get_all_frames(self):
        return [f.tolist() for f in self.frames]
    
    def get_current_receiver_data(self):
        return {k: v.tolist() for k, v in self.receiver_data.items()}
    
    def get_time_axis(self, nsteps=None):
        if nsteps is None and self.solver:
            nsteps = self.solver.current_step
        return np.arange(nsteps) * self.dt
    
    def reset(self):
        self.solver = None
        self.config = None
        self.is_running = False
        self.frames = []
        self.receiver_data = {}


def get_default_config():
    return {
        'nx': 200,
        'nz': 200,
        'dx': 5.0,
        'dz': 5.0,
        'vp': 3000.0,
        'vs': 1732.0,
        'rho': 2500.0,
        'pml_width': 20,
        'source': {
            'type': 'ricker',
            'frequency': 20.0,
            'amplitude': 1e6,
            'x': 100,
            'z': 50
        },
        'receivers': [
            {'x': 50, 'z': 180, 'name': 'REC_0'},
            {'x': 100, 'z': 180, 'name': 'REC_1'},
            {'x': 150, 'z': 180, 'name': 'REC_2'}
        ]
    }


def get_default_receiver_array_config():
    return {
        'type': 'line',
        'start_x': 30,
        'start_z': 180,
        'end_x': 170,
        'end_z': 180,
        'num_receivers': 15,
        'prefix': 'REC'
    }
