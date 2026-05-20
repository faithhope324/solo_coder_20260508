import faiss
import numpy as np
import os
import json
from typing import List, Dict, Tuple, Optional


class VectorDatabase:
    def __init__(self, index_dir: str = "index", dimension: int = 512):
        self.index_dir = index_dir
        self.dimension = dimension
        self.index_path = os.path.join(index_dir, "faiss.index")
        self.mapping_path = os.path.join(index_dir, "image_mapping.json")

        os.makedirs(index_dir, exist_ok=True)

        self.index = None
        self.image_paths: List[str] = []
        self._load_or_create()

    def _load_or_create(self):
        if os.path.exists(self.index_path) and os.path.exists(self.mapping_path):
            self._load()
        else:
            self._create_new()

    def _create_new(self):
        self.index = faiss.IndexFlatIP(self.dimension)
        self.image_paths = []
        print("Created new FAISS index")

    def _load(self):
        self.index = faiss.read_index(self.index_path)
        with open(self.mapping_path, "r", encoding="utf-8") as f:
            self.image_paths = json.load(f)
        print(f"Loaded FAISS index with {len(self.image_paths)} images")

    def save(self):
        faiss.write_index(self.index, self.index_path)
        with open(self.mapping_path, "w", encoding="utf-8") as f:
            json.dump(self.image_paths, f, ensure_ascii=False, indent=2)
        print(f"Saved FAISS index with {len(self.image_paths)} images")

    def add_vector(self, vector: np.ndarray, image_path: str):
        if vector.ndim == 1:
            vector = vector.reshape(1, -1)
        vector = vector.astype(np.float32)
        faiss.normalize_L2(vector)
        self.index.add(vector)
        self.image_paths.append(image_path)

    def add_vectors(self, vectors: np.ndarray, image_paths: List[str]):
        vectors = vectors.astype(np.float32)
        faiss.normalize_L2(vectors)
        self.index.add(vectors)
        self.image_paths.extend(image_paths)

    def search(self, query_vector: np.ndarray, top_k: int = 10) -> List[Dict]:
        if self.index.ntotal == 0:
            return []

        if query_vector.ndim == 1:
            query_vector = query_vector.reshape(1, -1)
        query_vector = query_vector.astype(np.float32)
        faiss.normalize_L2(query_vector)

        top_k = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query_vector, top_k)

        results = []
        for i in range(top_k):
            idx = indices[0][i]
            score = float(scores[0][i])
            if idx >= 0 and idx < len(self.image_paths):
                results.append({
                    "image_path": self.image_paths[idx],
                    "image_name": os.path.basename(self.image_paths[idx]),
                    "similarity": round(max(0, min(1, score)), 4)
                })
        return results

    def get_total_images(self) -> int:
        return len(self.image_paths)

    def reset(self):
        self._create_new()
        if os.path.exists(self.index_path):
            os.remove(self.index_path)
        if os.path.exists(self.mapping_path):
            os.remove(self.mapping_path)

    def cleanup_deleted_images(self) -> int:
        existing_paths = []
        deleted_indices = []

        for idx, path in enumerate(self.image_paths):
            if os.path.exists(path):
                existing_paths.append(path)
            else:
                deleted_indices.append(idx)

        if not deleted_indices:
            return 0

        print(f"Found {len(deleted_indices)} deleted images, cleaning up...")

        all_vectors = self.index.reconstruct_n(0, self.index.ntotal)
        keep_mask = np.ones(self.index.ntotal, dtype=bool)
        keep_mask[deleted_indices] = False
        kept_vectors = all_vectors[keep_mask]

        self._create_new()
        if kept_vectors.shape[0] > 0:
            self.index.add(kept_vectors.astype(np.float32))
        self.image_paths = existing_paths

        self.save()
        print(f"Cleanup complete. Removed {len(deleted_indices)} entries.")
        return len(deleted_indices)
