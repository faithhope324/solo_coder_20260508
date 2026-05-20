import numpy as np
from filterpy.kalman import KalmanFilter


class KalmanFilter:
    def __init__(self):
        self.kf = KalmanFilter(dim_x=8, dim_z=4)
        self.kf.F = np.array([
            [1, 0, 0, 0, 1, 0, 0, 0],
            [0, 1, 0, 0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0, 0, 0, 1],
            [0, 0, 0, 0, 1, 0, 0, 0],
            [0, 0, 0, 0, 0, 1, 0, 0],
            [0, 0, 0, 0, 0, 0, 1, 0],
            [0, 0, 0, 0, 0, 0, 0, 1]
        ])
        
        self.kf.H = np.array([
            [1, 0, 0, 0, 0, 0, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0, 0, 0],
            [0, 0, 0, 1, 0, 0, 0, 0]
        ])
        
        self.kf.R[2:, 2:] *= 10.
        self.kf.P[4:, 4:] *= 1000.
        self.kf.P *= 10.
        self.kf.Q[-1, -1] *= 0.01
        self.kf.Q[4:, 4:] *= 0.01
    
    def initiate(self, measurement):
        mean_pos = measurement
        mean_vel = np.zeros_like(mean_pos)
        self.kf.x = np.r_[mean_pos, mean_vel]
        
        std = [
            2 * 10 * 0.01,
            2 * 10 * 0.01,
            2 * 10 * 0.01,
            2 * 10 * 0.01,
            10 * 0.01,
            10 * 0.01,
            10 * 0.01,
            10 * 0.01
        ]
        self.kf.P = np.diag(np.square(std))
    
    def predict(self):
        self.kf.predict()
        return self.kf.x[:4], self.kf.P
    
    def update(self, measurement):
        self.kf.update(measurement)
        return self.kf.x[:4], self.kf.P
    
    def get_covariance(self):
        return self.kf.P[:4, :4]
    
    def get_mean(self):
        return self.kf.x[:4]
