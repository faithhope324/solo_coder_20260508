import numpy as np


def ricker_wavelet(f0, t0=0.0):
    def wavelet(t):
        tau = np.pi * f0 * (t - t0)
        return (1 - 2 * tau**2) * np.exp(-tau**2)
    return wavelet


def gaussian_pulse(f0, t0=0.0):
    def wavelet(t):
        tau = np.pi * f0 * (t - t0)
        return np.exp(-tau**2) * np.sin(2 * tau)
    return wavelet


class SourceManager:
    @staticmethod
    def create_source(source_type, f0, t0=0.0, amplitude=1.0):
        if source_type == 'ricker':
            base_wavelet = ricker_wavelet(f0, t0)
        elif source_type == 'gaussian':
            base_wavelet = gaussian_pulse(f0, t0)
        else:
            raise ValueError(f"Unknown source type: {source_type}")
        
        def scaled_wavelet(t):
            return amplitude * base_wavelet(t)
        
        return scaled_wavelet


class ReceiverArray:
    @staticmethod
    def create_line_array(start_x, start_z, end_x, end_z, num_receivers, prefix='REC'):
        receivers = []
        for i in range(num_receivers):
            alpha = i / max(num_receivers - 1, 1)
            x = int(start_x + alpha * (end_x - start_x))
            z = int(start_z + alpha * (end_z - start_z))
            receivers.append({
                'x': x,
                'z': z,
                'name': f'{prefix}_{i:03d}'
            })
        return receivers
    
    @staticmethod
    def create_grid_array(x_start, x_end, x_step, z_start, z_end, z_step, prefix='REC'):
        receivers = []
        idx = 0
        for x in range(x_start, x_end + 1, x_step):
            for z in range(z_start, z_end + 1, z_step):
                receivers.append({
                    'x': x,
                    'z': z,
                    'name': f'{prefix}_{idx:03d}'
                })
                idx += 1
        return receivers
