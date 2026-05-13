import numpy as np
import pandas as pd
from sklearn.datasets import make_blobs

def generate_sample_data():
    np.random.seed(42)
    X1, y1 = make_blobs(n_samples=200, centers=3, n_features=10, random_state=42, cluster_std=1.0)
    X2, y2 = make_blobs(n_samples=150, centers=2, n_features=10, random_state=24, cluster_std=1.5, center_box=(-10, 10))
    X = np.vstack([X1, X2])
    noise = np.random.randn(30, 10) * 3
    X = np.vstack([X, noise])
    columns = [f'feature_{i+1}' for i in range(10)]
    df = pd.DataFrame(X, columns=columns)
    df.to_csv('sample_data.csv', index=False)
    print(f"生成了 {len(df)} 个样本，包含 {df.shape[1]} 个特征")
    print("文件已保存为 sample_data.csv")

if __name__ == '__main__':
    generate_sample_data()
