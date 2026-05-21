import torch
import torch.nn as nn
import numpy as np

class LSTMModel(nn.Module):
    def __init__(self, input_size=1, hidden_size=64, num_layers=2, output_size=6, dropout=0.2):
        super(LSTMModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0
        )
        
        self.fc = nn.Linear(hidden_size, output_size)
        self.dropout = nn.Dropout(dropout)
    
    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        
        out, _ = self.lstm(x, (h0, c0))
        out = out[:, -1, :]
        out = self.dropout(out)
        out = self.fc(out)
        
        return out

class TrafficPredictor:
    def __init__(self, seq_length=72, pred_length=6):
        self.seq_length = seq_length
        self.pred_length = pred_length
        self.model = None
        self.mean = None
        self.std = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    def train(self, X_train, y_train, X_test, y_test, epochs=50, batch_size=32, lr=0.001):
        self.model = LSTMModel(
            input_size=1,
            hidden_size=64,
            num_layers=2,
            output_size=self.pred_length
        ).to(self.device)
        
        X_train_tensor = torch.FloatTensor(X_train).unsqueeze(-1).to(self.device)
        y_train_tensor = torch.FloatTensor(y_train).to(self.device)
        X_test_tensor = torch.FloatTensor(X_test).unsqueeze(-1).to(self.device)
        y_test_tensor = torch.FloatTensor(y_test).to(self.device)
        
        criterion = nn.MSELoss()
        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        
        train_dataset = torch.utils.data.TensorDataset(X_train_tensor, y_train_tensor)
        train_loader = torch.utils.data.DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        
        self.model.train()
        for epoch in range(epochs):
            total_loss = 0
            for batch_X, batch_y in train_loader:
                optimizer.zero_grad()
                outputs = self.model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()
            
            if (epoch + 1) % 10 == 0:
                self.model.eval()
                with torch.no_grad():
                    test_outputs = self.model(X_test_tensor)
                    test_loss = criterion(test_outputs, y_test_tensor)
                print(f'Epoch [{epoch+1}/{epochs}], Train Loss: {total_loss/len(train_loader):.4f}, Test Loss: {test_loss.item():.4f}')
                self.model.train()
        
        return self.model
    
    def predict(self, recent_data, mean, std, n_samples=100):
        self.model.eval()
        self.mean = mean
        self.std = std
        
        recent_normalized = (recent_data - mean) / std
        x_tensor = torch.FloatTensor(recent_normalized).unsqueeze(0).unsqueeze(-1).to(self.device)
        
        with torch.no_grad():
            predictions = []
            self.model.train()
            for _ in range(n_samples):
                pred = self.model(x_tensor)
                predictions.append(pred.cpu().numpy()[0])
            
            predictions = np.array(predictions)
            mean_pred = np.mean(predictions, axis=0)
            std_pred = np.std(predictions, axis=0)
            
            mean_pred_original = mean_pred * std + mean
            lower_bound = (mean_pred - 1.96 * std_pred) * std + mean
            upper_bound = (mean_pred + 1.96 * std_pred) * std + mean
            
            lower_bound = np.maximum(lower_bound, 0)
        
        return {
            'mean': mean_pred_original.tolist(),
            'lower': lower_bound.tolist(),
            'upper': upper_bound.tolist()
        }
    
    def save(self, path):
        torch.save({
            'model_state_dict': self.model.state_dict(),
            'seq_length': self.seq_length,
            'pred_length': self.pred_length
        }, path)
    
    def load(self, path):
        checkpoint = torch.load(path, map_location=self.device)
        self.seq_length = checkpoint['seq_length']
        self.pred_length = checkpoint['pred_length']
        self.model = LSTMModel(
            input_size=1,
            hidden_size=64,
            num_layers=2,
            output_size=self.pred_length
        ).to(self.device)
        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.model.eval()
