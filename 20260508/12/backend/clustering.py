import numpy as np
from sklearn.cluster import DBSCAN
try:
    import hdbscan
    HAS_HDBSCAN = True
except ImportError:
    HAS_HDBSCAN = False


class Clusterer:
    def __init__(self, algorithm='dbscan', eps=0.5, min_samples=5):
        self.algorithm = algorithm.lower()
        self.eps = eps
        self.min_samples = min_samples

    def fit_predict(self, X):
        if self.algorithm == 'dbscan':
            return self._dbscan_clustering(X)
        elif self.algorithm == 'hdbscan':
            return self._hdbscan_clustering(X)
        else:
            raise ValueError(f"Unknown algorithm: {self.algorithm}")

    def _dbscan_clustering(self, X):
        dbscan = DBSCAN(eps=self.eps, min_samples=self.min_samples)
        labels = dbscan.fit_predict(X)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = list(labels).count(-1)
        return {
            'labels': labels.tolist(),
            'n_clusters': n_clusters,
            'n_noise': n_noise,
            'algorithm': 'DBSCAN',
            'parameters': {
                'eps': self.eps,
                'min_samples': self.min_samples
            }
        }

    def _hdbscan_clustering(self, X):
        if not HAS_HDBSCAN:
            raise ImportError("hdbscan is not installed. Please install it with: pip install hdbscan")
        clusterer = hdbscan.HDBSCAN(min_samples=self.min_samples)
        labels = clusterer.fit_predict(X)
        n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
        n_noise = list(labels).count(-1)
        return {
            'labels': labels.tolist(),
            'n_clusters': n_clusters,
            'n_noise': n_noise,
            'algorithm': 'HDBSCAN',
            'parameters': {
                'min_samples': self.min_samples
            }
        }
