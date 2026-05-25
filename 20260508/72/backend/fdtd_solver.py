import numpy as np


class ElasticFDTD2D:
    def __init__(self, nx=200, nz=200, dx=5.0, dz=5.0, dt=0.001,
                 vp=3000.0, vs=1732.0, rho=2500.0, pml_width=20):
        self.nx = nx
        self.nz = nz
        self.dx = dx
        self.dz = dz
        self.dt = dt
        self.pml_width = pml_width
        
        self.nx_total = nx + 2 * pml_width
        self.nz_total = nz + 2 * pml_width
        
        self.vp = vp * np.ones((self.nz_total, self.nx_total))
        self.vs = vs * np.ones((self.nz_total, self.nx_total))
        self.rho = rho * np.ones((self.nz_total, self.nx_total))
        
        self.lam = self.rho * (self.vp**2 - 2 * self.vs**2)
        self.mu = self.rho * self.vs**2
        
        self.vx = np.zeros((self.nz_total, self.nx_total))
        self.vz = np.zeros((self.nz_total, self.nx_total))
        self.txx = np.zeros((self.nz_total, self.nx_total))
        self.tzz = np.zeros((self.nz_total, self.nx_total))
        self.txz = np.zeros((self.nz_total, self.nx_total))
        
        self.pressure = np.zeros((self.nz_total, self.nx_total))
        
        self._init_damping()
        
        self.sources = []
        self.receivers = []
        
        self.current_step = 0
        self.receiver_data = {}
    
    def _init_damping(self):
        nx, nz = self.nx_total, self.nz_total
        pw = self.pml_width
        vmax = np.max(self.vp)
        d0 = 2.0 * vmax / (pw * self.dx)
        
        self.damp_x = np.ones(nx)
        self.damp_z = np.ones(nz)
        
        for i in range(pw):
            dist = pw - i
            damp = 1.0 / (1.0 + d0 * (dist / pw) ** 2 * self.dt)
            self.damp_x[i] = damp
            self.damp_x[nx - 1 - i] = damp
            self.damp_z[i] = damp
            self.damp_z[nz - 1 - i] = damp
        
        self.damp_x_2d = np.tile(self.damp_x, (nz, 1))
        self.damp_z_2d = np.tile(self.damp_z.reshape(-1, 1), (1, nx))
        self.damp_2d = np.minimum(self.damp_x_2d, self.damp_z_2d)
    
    def set_source(self, x_idx, z_idx, source_func, source_type='velocity'):
        x_idx += self.pml_width
        z_idx += self.pml_width
        self.sources.append({
            'x': x_idx,
            'z': z_idx,
            'func': source_func,
            'type': source_type
        })
    
    def add_receiver(self, x_idx, z_idx, name):
        x_idx += self.pml_width
        z_idx += self.pml_width
        self.receivers.append({
            'x': x_idx,
            'z': z_idx,
            'name': name
        })
        self.receiver_data[name] = []
    
    def _apply_damping(self):
        self.vx *= self.damp_2d
        self.vz *= self.damp_2d
        self.txx *= self.damp_2d
        self.tzz *= self.damp_2d
        self.txz *= self.damp_2d
    
    def _update_stress(self):
        nx, nz = self.nx_total, self.nz_total
        
        dvx_dx = np.zeros((nz, nx))
        dvz_dz = np.zeros((nz, nx))
        dvx_dz = np.zeros((nz, nx))
        dvz_dx = np.zeros((nz, nx))
        
        dvx_dx[:, 1:-1] = (self.vx[:, 2:] - self.vx[:, :-2]) / (2 * self.dx)
        dvz_dz[1:-1, :] = (self.vz[2:, :] - self.vz[:-2, :]) / (2 * self.dz)
        dvx_dz[1:-1, :] = (self.vx[2:, :] - self.vx[:-2, :]) / (2 * self.dz)
        dvz_dx[:, 1:-1] = (self.vz[:, 2:] - self.vz[:, :-2]) / (2 * self.dx)
        
        self.txx += self.dt * ((self.lam + 2 * self.mu) * dvx_dx + self.lam * dvz_dz)
        self.tzz += self.dt * (self.lam * dvx_dx + (self.lam + 2 * self.mu) * dvz_dz)
        self.txz += self.dt * self.mu * (dvx_dz + dvz_dx)
    
    def _update_velocity(self):
        nx, nz = self.nx_total, self.nz_total
        
        dtxx_dx = np.zeros((nz, nx))
        dtzz_dz = np.zeros((nz, nx))
        dtxz_dx = np.zeros((nz, nx))
        dtxz_dz = np.zeros((nz, nx))
        
        dtxx_dx[:, 1:-1] = (self.txx[:, 2:] - self.txx[:, :-2]) / (2 * self.dx)
        dtzz_dz[1:-1, :] = (self.tzz[2:, :] - self.tzz[:-2, :]) / (2 * self.dz)
        dtxz_dx[:, 1:-1] = (self.txz[:, 2:] - self.txz[:, :-2]) / (2 * self.dx)
        dtxz_dz[1:-1, :] = (self.txz[2:, :] - self.txz[:-2, :]) / (2 * self.dz)
        
        dt_rho = self.dt / self.rho
        
        self.vx += dt_rho * (dtxx_dx + dtxz_dz)
        self.vz += dt_rho * (dtxz_dx + dtzz_dz)
    
    def _apply_sources(self):
        t = self.current_step * self.dt
        for src in self.sources:
            val = src['func'](t)
            if src['type'] == 'velocity':
                self.vz[src['z'], src['x']] += val * self.dt
            elif src['type'] == 'stress':
                self.txx[src['z'], src['x']] += val * self.dt
                self.tzz[src['z'], src['x']] += val * self.dt
    
    def _record_receivers(self):
        for rec in self.receivers:
            vz_val = self.vz[rec['z'], rec['x']]
            self.receiver_data[rec['name']].append(vz_val)
    
    def step(self):
        self._update_stress()
        self._apply_sources()
        self._apply_damping()
        self._update_velocity()
        self._apply_damping()
        self._record_receivers()
        self.pressure = -0.5 * (self.txx + self.tzz)
        self.current_step += 1
    
    def run(self, nsteps, callback=None, callback_interval=10):
        for i in range(nsteps):
            self.step()
            if callback and i % callback_interval == 0:
                callback(self.get_wavefield(), self.current_step)
    
    def get_wavefield(self):
        pw = self.pml_width
        return self.pressure[pw:-pw, pw:-pw].copy()
    
    def get_receiver_data(self, name):
        return np.array(self.receiver_data.get(name, []))
    
    def get_all_receiver_data(self):
        return {name: np.array(data) for name, data in self.receiver_data.items()}
    
    def get_velocity_field(self):
        pw = self.pml_width
        return {
            'vx': self.vx[pw:-pw, pw:-pw].copy(),
            'vz': self.vz[pw:-pw, pw:-pw].copy()
        }
