import torch
import numpy as np
from PIL import Image
from typing import List
from transformers import CLIPProcessor, CLIPModel


class FeatureExtractor:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Using device: {self.device}")

        self.model_name = "openai/clip-vit-base-patch32"
        print(f"Loading CLIP model: {self.model_name}")

        self.model = CLIPModel.from_pretrained(self.model_name)
        self.processor = CLIPProcessor.from_pretrained(self.model_name)

        self.model.eval()
        self.model.to(self.device)

        self.feature_dim = 512

    def extract_image_feature(self, image_path: str) -> np.ndarray:
        image = Image.open(image_path).convert("RGB")
        return self._extract_image_feature_from_pil(image)

    def extract_image_feature_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        from io import BytesIO
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        return self._extract_image_feature_from_pil(image)

    def _extract_image_feature_from_pil(self, image: Image.Image) -> np.ndarray:
        with torch.no_grad():
            inputs = self.processor(images=image, return_tensors="pt", padding=True)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            features = self.model.get_image_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)
            return features.cpu().numpy().squeeze()

    def extract_text_feature(self, text: str) -> np.ndarray:
        with torch.no_grad():
            inputs = self.processor(text=text, return_tensors="pt", padding=True, truncation=True, max_length=77)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            features = self.model.get_text_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)
            return features.cpu().numpy().squeeze()

    def extract_text_features(self, texts: List[str]) -> np.ndarray:
        with torch.no_grad():
            inputs = self.processor(text=texts, return_tensors="pt", padding=True, truncation=True, max_length=77)
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            features = self.model.get_text_features(**inputs)
            features = features / features.norm(dim=-1, keepdim=True)
            return features.cpu().numpy()
