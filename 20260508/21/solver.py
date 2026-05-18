import numpy as np


class HeatEquationSolver2D:
    def __init__(self, nx=50, ny=50, alpha=0.01, dx=1.0, dy=1.0, dt=0.1):
        self.nx = nx
        self.ny = ny
        self.alpha = alpha
        self.dx = dx
        self.dy = dy
        self.dt = dt
        self.u = np.zeros((ny, nx))
        self.boundary_conditions = {
            'left': {'type': 'fixed', 'value': 0.0},
            'right': {'type': 'fixed', 'value': 0.0},
            'top': {'type': 'fixed', 'value': 0.0},
            'bottom': {'type': 'fixed', 'value': 0.0}
        }
        self._check_stability()

    def _check_stability(self):
        rx = self.alpha * self.dt / (self.dx ** 2)
        ry = self.alpha * self.dt / (self.dy ** 2)
        if rx + ry > 0.5:
            raise ValueError(
                f"稳定性条件不满足: r={rx + ry:.4f} > 0.5。请减小时间步长dt或增大网格间距dx/dy。"
            )

    def set_initial_condition(self, pattern='center_square', center_temp=100.0, background_temp=0.0, square_size=0.2):
        self.u.fill(background_temp)
        if pattern == 'center_square':
            cx, cy = self.nx // 2, self.ny // 2
            half_size = int(min(self.nx, self.ny) * square_size / 2)
            self.u[cy - half_size:cy + half_size, cx - half_size:cx + half_size] = center_temp
        elif pattern == 'center_circle':
            cx, cy = self.nx // 2, self.ny // 2
            radius = int(min(self.nx, self.ny) * square_size / 2)
            y, x = np.ogrid[:self.ny, :self.nx]
            mask = (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2
            self.u[mask] = center_temp
        elif pattern == 'random':
            self.u = np.random.uniform(background_temp, center_temp, (self.ny, self.nx))
        elif pattern == 'corner_hot':
            self.u[0:5, 0:5] = center_temp
            self.u[-5:, -5:] = center_temp

    def set_boundary_condition(self, side, bc_type, value=0.0):
        if side in self.boundary_conditions:
            self.boundary_conditions[side] = {'type': bc_type, 'value': value}

    def _apply_boundary_conditions(self):
        bc = self.boundary_conditions
        if bc['left']['type'] == 'fixed':
            self.u[:, 0] = bc['left']['value']
        else:
            self.u[:, 0] = self.u[:, 1]

        if bc['right']['type'] == 'fixed':
            self.u[:, -1] = bc['right']['value']
        else:
            self.u[:, -1] = self.u[:, -2]

        if bc['bottom']['type'] == 'fixed':
            self.u[0, :] = bc['bottom']['value']
        else:
            self.u[0, :] = self.u[1, :]

        if bc['top']['type'] == 'fixed':
            self.u[-1, :] = bc['top']['value']
        else:
            self.u[-1, :] = self.u[-2, :]

    def step(self, n_steps=1):
        for _ in range(n_steps):
            u_new = np.copy(self.u)
            rx = self.alpha * self.dt / (self.dx ** 2)
            ry = self.alpha * self.dt / (self.dy ** 2)

            u_new[1:-1, 1:-1] = self.u[1:-1, 1:-1] + \
                rx * (self.u[1:-1, 2:] - 2 * self.u[1:-1, 1:-1] + self.u[1:-1, :-2]) + \
                ry * (self.u[2:, 1:-1] - 2 * self.u[1:-1, 1:-1] + self.u[:-2, 1:-1])

            self.u = u_new
            self._apply_boundary_conditions()

        return self.u

    def get_state(self):
        return self.u.tolist()

    def reset(self):
        self.u.fill(0.0)
