import os
import sys
import json
import argparse
import itertools
import numpy as np
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_processing.data_loader import TrafficDataProcessor
from model.lstm_model import TrafficLSTM, ModelTrainer


def grid_search(csv_path, intersection_id, param_grid, save_dir, seq_length=24, device='cpu'):
    processor = TrafficDataProcessor(seq_length=seq_length)
    df = processor.load_csv(csv_path)
    scaled_data, scaler = processor.preprocess_for_intersection(df, intersection_id)
    X, y = processor.create_sequences(scaled_data)
    X_train, X_val, y_train, y_val = processor.split_data(X, y, train_ratio=0.8)
    param_names = list(param_grid.keys())
    param_values = list(param_grid.values())
    all_results = []
    best_result = None
    best_val_loss = float('inf')
    print(f"开始网格搜索，参数组合数: {np.prod([len(v) for v in param_values])}")
    print(f"参数网格: {json.dumps(param_grid, indent=2, ensure_ascii=False)}")
    for idx, combination in enumerate(itertools.product(*param_values)):
        params = dict(zip(param_names, combination))
        print(f"\n[{idx+1}] 测试参数: {params}")
        model = TrafficLSTM(
            input_size=1,
            hidden_size=params.get('hidden_size', 64),
            num_layers=params.get('num_layers', 2),
            output_size=1,
            dropout=params.get('dropout', 0.2)
        )
        trainer = ModelTrainer(model, device=device)
        try:
            history = trainer.train(
                X_train, y_train, X_val, y_val,
                epochs=params.get('epochs', 100),
                batch_size=params.get('batch_size', 32),
                learning_rate=params.get('learning_rate', 0.001),
                early_stopping_patience=params.get('early_stopping_patience', 10)
            )
            result = {
                'params': params,
                'final_train_loss': history['final_train_loss'],
                'final_val_loss': history['final_val_loss'],
                'best_val_loss': history['best_val_loss'],
                'epochs_trained': history['epochs'],
                'training_time_seconds': history['training_time_seconds']
            }
            all_results.append(result)
            if history['best_val_loss'] < best_val_loss:
                best_val_loss = history['best_val_loss']
                best_result = result
                print(f"新的最佳验证损失: {best_val_loss:.6f}")
            print(f"验证损失: {history['best_val_loss']:.6f}")
        except Exception as e:
            print(f"训练失败: {e}")
            result = {
                'params': params,
                'error': str(e)
            }
            all_results.append(result)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    tuning_results = {
        'intersection_id': intersection_id,
        'timestamp': timestamp,
        'param_grid': param_grid,
        'total_combinations': len(all_results),
        'best_result': best_result,
        'all_results': all_results
    }
    os.makedirs(save_dir, exist_ok=True)
    results_path = os.path.join(save_dir, f"tuning_results_{intersection_id}_{timestamp}.json")
    with open(results_path, 'w', encoding='utf-8') as f:
        json.dump(tuning_results, f, indent=2, ensure_ascii=False)
    print(f"\n{'='*60}")
    print(f"网格搜索完成")
    print(f"最佳参数: {best_result['params'] if best_result else 'None'}")
    print(f"最佳验证损失: {best_val_loss:.6f}")
    print(f"调优结果已保存到: {results_path}")
    print(f"{'='*60}")
    return tuning_results


def get_default_param_grid():
    return {
        'hidden_size': [32, 64, 128],
        'num_layers': [1, 2],
        'dropout': [0.1, 0.2, 0.3],
        'learning_rate': [0.001, 0.0005],
        'batch_size': [16, 32],
        'epochs': [100],
        'early_stopping_patience': [10]
    }


def main():
    parser = argparse.ArgumentParser(description='交通流量预测模型超参数调优')
    parser.add_argument('--csv_path', type=str, default='data/sample_traffic_data.csv', help='CSV数据文件路径')
    parser.add_argument('--intersection_id', type=str, required=True, help='路口ID')
    parser.add_argument('--save_dir', type=str, default='tuning_results', help='调优结果保存目录')
    parser.add_argument('--seq_length', type=int, default=24, help='序列长度')
    parser.add_argument('--device', type=str, default='cpu', help='设备 (cpu/cuda)')
    parser.add_argument('--config', type=str, default=None, help='参数网格配置JSON文件路径')
    args = parser.parse_args()
    if args.config and os.path.exists(args.config):
        with open(args.config, 'r', encoding='utf-8') as f:
            param_grid = json.load(f)
    else:
        param_grid = get_default_param_grid()
    grid_search(args.csv_path, args.intersection_id, param_grid, args.save_dir, args.seq_length, args.device)


if __name__ == '__main__':
    main()
