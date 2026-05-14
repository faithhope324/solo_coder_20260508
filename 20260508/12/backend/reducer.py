import numpy as np
from sklearn.preprocessing import StandardScaler
try:
    import umap.umap_ as umap
    HAS_UMAP = True
except ImportError:
    HAS_UMAP = False


class UMAPReducer:
    def __init__(self, n_components=2, n_neighbors=15, min_dist=0.1, random_state=42):
        self.n_components = n_components
        self.n_neighbors = n_neighbors
        self.min_dist = min_dist
        self.random_state = random_state
        self.scaler = StandardScaler()

    def fit_transform(self, X):
        if not HAS_UMAP:
            raise ImportError("umap-learn is not installed. Please install it with: pip install umap-learn")
        X_scaled = self.scaler.fit_transform(X)
        reducer = umap.UMAP(
            n_components=self.n_components,
            n_neighbors=self.n_neighbors,
            min_dist=self.min_dist,
            random_state=self.random_state
        )
        embedding = reducer.fit_transform(X_scaled)
        return {
            'embedding': embedding.tolist(),
            'n_components': self.n_components,
            'parameters': {
                'n_neighbors': self.n_neighbors,
                'min_dist': self.min_dist
            }
        }
