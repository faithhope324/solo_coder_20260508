import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_historical_data(days=30, start_date=None):
    if start_date is None:
        start_date = datetime.now() - timedelta(days=days)
    
    timestamps = []
    flows = []
    
    current = start_date.replace(minute=0, second=0, microsecond=0)
    end = start_date + timedelta(days=days)
    
    while current < end:
        hour = current.hour
        minute = current.minute
        day_of_week = current.weekday()
        
        time_of_day = hour + minute / 60
        
        morning_peak = np.exp(-0.5 * ((time_of_day - 8) / 1.5) ** 2) * 180
        evening_peak = np.exp(-0.5 * ((time_of_day - 18) / 2) ** 2) * 160
        noon_flow = np.exp(-0.5 * ((time_of_day - 12) / 2) ** 2) * 80
        
        base_flow = 40 + morning_peak + evening_peak + noon_flow
        
        if day_of_week >= 5:
            base_flow *= 0.65
        
        noise = np.random.normal(0, base_flow * 0.15)
        flow = max(10, base_flow + noise)
        
        timestamps.append(current)
        flows.append(flow)
        
        current += timedelta(minutes=5)
    
    df = pd.DataFrame({
        'timestamp': timestamps,
        'flow': flows
    })
    
    return df

def create_sequences(data, seq_length, pred_length):
    X, y = [], []
    for i in range(len(data) - seq_length - pred_length + 1):
        X.append(data[i:(i + seq_length)])
        y.append(data[(i + seq_length):(i + seq_length + pred_length)])
    return np.array(X), np.array(y)

def prepare_training_data(df, seq_length=72, pred_length=6):
    flows = df['flow'].values
    
    mean = np.mean(flows)
    std = np.std(flows)
    flows_normalized = (flows - mean) / std
    
    X, y = create_sequences(flows_normalized, seq_length, pred_length)
    
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    return {
        'X_train': X_train,
        'y_train': y_train,
        'X_test': X_test,
        'y_test': y_test,
        'mean': mean,
        'std': std,
        'seq_length': seq_length,
        'pred_length': pred_length
    }
