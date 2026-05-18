import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
import numpy as np
import os
import json
from typing import Dict, Tuple, List, Optional
from datetime import datetime


class TrafficLSTM(nn.Module):
    def __init__(self, input_size: int = 1, hidden_size: int = 64, num_layers: int = 2, output_size: int = 1, dropout: float = 0.2):
        super(TrafficLSTM, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = self.fc(out[:, -1, :])
        return out


class ModelTrainer:
    def __init__(self, model: TrafficLSTM, device: str = 'cpu'):
        self.model = model.to(device)
        self.device = device
        self.criterion = nn.MSELoss()
        self.train_losses: List[float] = []
        self.val_losses: List[float] = []

    def train(self, X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray, epochs: int = 100, batch_size: int = 32, learning_rate: float = 0.001, early_stopping_patience: int = 10) -> Dict:
        X_train_tensor = torch.FloatTensor(X_train).to(self.device)
        y_train_tensor = torch.FloatTensor(y_train).to(self.device)
        X_val_tensor = torch.FloatTensor(X_val).to(self.device)
        y_val_tensor = torch.FloatTensor(y_val).to(self.device)
        train_dataset = TensorDataset(X_train_tensor, y_train_tensor)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
        best_val_loss = float('inf')
        patience_counter = 0
        training_start = datetime.now()
        for epoch in range(epochs):
            self.model.train()
            train_loss = 0.0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = self.criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                train_loss += loss.item() * batch_X.size(0)
            train_loss /= len(train_loader.dataset)
            self.train_losses.append(train_loss)
            self.model.eval()
            with torch.no_grad():
                val_outputs = self.model(X_val_tensor)
                val_loss = self.criterion(val_outputs, y_val_tensor).item()
                self.val_losses.append(val_loss)
            if val_loss < best_val_loss:
                best_val_loss = val_loss
                patience_counter = 0
            else:
                patience_counter += 1
                if patience_counter >= early_stopping_patience:
                    print(f"早停于 epoch {epoch+1}，验证损失: {val_loss:.6f}")
                    break
            if (epoch + 1) % 10 == 0:
                print(f"Epoch [{epoch+1}/{epochs}], Train Loss: {train_loss:.6f}, Val Loss: {val_loss:.6f}")
        training_time = (datetime.now() - training_start).total_seconds()
        return {
            'epochs': epoch + 1,
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'final_train_loss': train_loss,
            'final_val_loss': val_loss,
            'best_val_loss': best_val_loss,
            'training_time_seconds': training_time
        }

    def predict(self, X: np.ndarray) -> np.ndarray:
        self.model.eval()
        X_tensor = torch.FloatTensor(X).to(self.device)
        with torch.no_grad():
            predictions = self.model(X_tensor)
        return predictions.cpu().numpy()

    def save_model(self, save_dir: str, intersection_id: str, hyperparams: Dict, training_history: Dict) -> str:
        os.makedirs(save_dir, exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        model_filename = f"lstm_{intersection_id}_{timestamp}.pth"
        model_path = os.path.join(save_dir, model_filename)
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'hyperparams': hyperparams,
            'training_history': training_history,
            'intersection_id': intersection_id,
            'timestamp': timestamp
        }, model_path)
        metadata = {
            'intersection_id': intersection_id,
            'model_path': model_path,
            'hyperparams': hyperparams,
            'training_history': {
                'final_train_loss': training_history['final_train_loss'],
                'final_val_loss': training_history['final_val_loss'],
                'best_val_loss': training_history['best_val_loss'],
                'epochs': training_history['epochs'],
                'training_time_seconds': training_history['training_time_seconds']
            },
            'timestamp': timestamp
        }
        metadata_path = os.path.join(save_dir, f"metadata_{intersection_id}_{timestamp}.json")
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2, ensure_ascii=False)
        print(f"模型已保存到: {model_path}")
        print(f"元数据已保存到: {metadata_path}")
        return model_path


def load_model(model_path: str, device: str = 'cpu') -> Tuple[TrafficLSTM, Dict]:
    checkpoint = torch.load(model_path, map_location=device)
    hyperparams = checkpoint['hyperparams']
    model = TrafficLSTM(
        input_size=hyperparams.get('input_size', 1),
        hidden_size=hyperparams.get('hidden_size', 64),
        num_layers=hyperparams.get('num_layers', 2),
        output_size=hyperparams.get('output_size', 1),
        dropout=hyperparams.get('dropout', 0.2)
    )
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    return model, checkpoint
