import os
import sys
from pathlib import Path
from typing import List

project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from backend.feature_extractor import FeatureExtractor
from backend.vector_db import VectorDatabase

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"}


def get_image_paths(images_dir: str) -> List[str]:
    image_paths = []
    for root, dirs, files in os.walk(images_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IMAGE_EXTENSIONS:
                image_paths.append(os.path.join(root, file))
    return sorted(image_paths)


def build_index(images_dir: str = "images", index_dir: str = "index", reset: bool = False, cleanup: bool = True, progress_callback=None):
    images_dir = os.path.abspath(images_dir)
    index_dir = os.path.abspath(index_dir)

    if not os.path.exists(images_dir):
        os.makedirs(images_dir)
        print(f"Created images directory: {images_dir}")
        print("Please add some images to the images directory and run again.")
        return

    image_paths = get_image_paths(images_dir)
    if not image_paths:
        print(f"No images found in {images_dir}")
        print("Please add some images to the images directory and run again.")
        return

    print(f"Found {len(image_paths)} images")

    if progress_callback:
        progress_callback("loading_model", 0, 0, "正在加载 CLIP 模型...")

    print("Loading CLIP model...")
    extractor = FeatureExtractor()

    db = VectorDatabase(index_dir=index_dir)
    if reset:
        print("Resetting existing index...")
        db.reset()
    elif cleanup:
        deleted_count = db.cleanup_deleted_images()
        if deleted_count > 0:
            print(f"Cleaned up {deleted_count} deleted images from index")

    existing_paths = set(db.image_paths)
    new_image_paths = [p for p in image_paths if p not in existing_paths]

    if not new_image_paths:
        print("No new images to index. Index is up to date.")
        if progress_callback:
            progress_callback("complete", 100, 0, "索引已是最新，无需更新")
        return

    total_new = len(new_image_paths)
    print(f"Indexing {total_new} new images...")

    vectors = []
    paths_to_add = []
    batch_size = 32

    for i, image_path in enumerate(new_image_paths):
        try:
            feature = extractor.extract_image_feature(image_path)
            vectors.append(feature)
            paths_to_add.append(image_path)

            progress = int((i + 1) / total_new * 100)
            if progress_callback:
                progress_callback(
                    "indexing", 
                    progress, 
                    i + 1, 
                    f"正在处理: {os.path.basename(image_path)} ({i + 1}/{total_new})"
                )

            if (i + 1) % 10 == 0:
                print(f"Processed {i + 1}/{total_new} images")

        except Exception as e:
            print(f"Error processing {image_path}: {e}")
            continue

    if vectors:
        import numpy as np
        vectors_np = np.array(vectors)
        db.add_vectors(vectors_np, paths_to_add)
        db.save()
        print(f"Successfully indexed {len(paths_to_add)} images")
        print(f"Total images in index: {db.get_total_images()}")
        
        if progress_callback:
            progress_callback(
                "complete", 
                100, 
                len(paths_to_add), 
                f"索引构建完成！共添加 {len(paths_to_add)} 张图片，当前索引总数: {db.get_total_images()}"
            )


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Build image feature index")
    parser.add_argument("--images-dir", default="images", help="Directory containing images")
    parser.add_argument("--index-dir", default="index", help="Directory to store index")
    parser.add_argument("--reset", action="store_true", help="Reset existing index")

    args = parser.parse_args()
    build_index(args.images_dir, args.index_dir, args.reset)
