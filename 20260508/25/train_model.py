import os
import sys
import argparse
import json
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_processing.data_loader import TrafficDataProcessor
from model.lstm_model import TrafficLSTM, ModelTrainer


def train_single_intersection(df, intersection_id, hyperparams, save_dir, seq_length=24, device='cpu'):
    print(f"\n{'='*60}")
    print(f"开始训练路口: {intersection_id}")
    print(f"{'='*60}")
    processor = TrafficDataProcessor(seq_length=seq_length)
    scaled_data, scaler = processor.preprocess_for_intersection(df, intersection_id)
    X, y = processor.create_sequences(scaled_data)
    if len(X) < 10:
        print(f"路口 {intersection_id} 数据量不足，跳过训练")
        return None
    X_train, X_val, y_train, y_val = processor.split_data(X, y, train_ratio=0.8)
    print(f"训练集大小: {len(X_train)}, 验证集大小: {len(X_val)}")
    model = TrafficLSTM(
        input_size=hyperparams.get('input_size', 1),
        hidden_size=hyperparams.get('hidden_size', 64),
        num_layers=hyperparams.get('num_layers', 2),
        output_size=hyperparams.get('output_size', 1),
        dropout=hyperparams.get('dropout', 0.2)
    )
    trainer = ModelTrainer(model, device=device)
    training_history = trainer.train(
        X_train, y_train, X_val, y_val,
        epochs=hyperparams.get('epochs', 100),
        batch_size=hyperparams.get('batch_size', 32),
        learning_rate=hyperparams.get('learning_rate', 0.001),
        early_stopping_patience=hyperparams.get('early_stopping_patience', 10)
    )
    model_path = trainer.save_model(save_dir, intersection_id, hyperparams, training_history)
    print(f"路口 {intersection_id} 训练完成，模型已保存")
    return {
        'intersection_id': intersection_id,
        'model_path': model_path,
        'training_history': training_history,
        'hyperparams': hyperparams
    }


def train_all_intersections(csv_path, save_dir, hyperparams, seq_length=24, device='cpu'):
    processor = TrafficDataProcessor(seq_length=seq_length)
    print(f"加载数据: {csv_path}")
    df = processor.load_csv(csv_path)
    print(f"数据加载完成，共 {len(df)} 条记录")
    print(f"路口列表: {processor.intersection_ids}")
    results = []
    for intersection_id in processor.intersection_ids:
        result = train_single_intersection(df, intersection_id, hyperparams, save_dir, seq_length, device)
        if result:
            results.append(result)
    summary_path = os.path.join(save_dir, 'training_summary.json')
    with open(summary_path, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False, default=str)
    print(f"\n{'='*60}")
    print(f"训练完成，共训练 {len(results)} 个路口模型")
    print(f"训练摘要已保存到: {summary_path}")
    print(f"{'='*60}")
    return results


def main():
    parser = argparse.ArgumentParser(description='交通流量预测LSTM模型训练')
    parser.add_argument('--csv_path', type=str, default='data/sample_traffic_data.csv', help='CSV数据文件路径')
    parser.add_argument('--save_dir', type=str, default='saved_models', help='模型保存目录')
    parser.add_argument('--seq_length', type=int, default=24, help='序列长度')
    parser.add_argument('--hidden_size', type=int, default=64, help='LSTM隐藏层大小')
    parser.add_argument('--num_layers', type=int, default=2, help='LSTM层数')
    parser.add_argument('--dropout', type=float, default=0.2, help='Dropout率')
    parser.add_argument('--epochs', type=int, default=100, help='训练轮数')
    parser.add_argument('--batch_size', type=int, default=32, help='批次大小')
    parser.add_argument('--learning_rate', type=float, default=0.001, help='学习率')
    parser.add_argument('--device', type=str, default='cpu', help='设备 (cpu/cuda)')
    parser.add_argument('--generate_sample', action='store_true', help='生成示例数据')
    args = parser.parse_args()
    if args.generate_sample:
        processor = TrafficDataProcessor()
        processor.save_sample_data(args.csv_path, days=60, num_intersections=5)
    hyperparams = {
        'input_size': 1,
        'output_size': 1,
        'hidden_size': args.hidden_size,
        'num_layers': args.num_layers,
        'dropout': args.dropout,
        'epochs': args.epochs,
        'batch_size': args.batch_size,
        'learning_rate': args.learning_rate,
        'early_stopping_patience': 10,
        'seq_length': args.seq_length
    }
    train_all_intersections(args.csv_path, args.save_dir, hyperparams, args.seq_length, args.device)


if __name__ == '__main__':
    main()
