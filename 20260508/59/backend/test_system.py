import sys
sys.path.insert(0, '.')

from app.data_generator import generate_historical_data, prepare_training_data
from app.lstm_model import TrafficPredictor
from app.simulation_engine import TrafficSimulationEngine, evaluate_signal_timing

print("=" * 60)
print("交通流量预测与信号优化系统 - 功能测试")
print("=" * 60)

print("\n1. 生成历史交通数据...")
df = generate_historical_data(days=7)
print(f"   ✓ 生成 {len(df)} 条数据记录")
print(f"   ✓ 时间范围: {df['timestamp'].min()} 到 {df['timestamp'].max()}")
print(f"   ✓ 平均流量: {df['flow'].mean():.2f} 辆/5分钟")

print("\n2. 准备训练数据...")
data_stats = prepare_training_data(df, seq_length=72, pred_length=6)
print(f"   ✓ 训练样本: {len(data_stats['X_train'])}")
print(f"   ✓ 测试样本: {len(data_stats['X_test'])}")
print(f"   ✓ 序列长度: {data_stats['seq_length']}")
print(f"   ✓ 预测步长: {data_stats['pred_length']}")

print("\n3. 训练LSTM模型 (简化版)...")
predictor = TrafficPredictor(seq_length=72, pred_length=6)
predictor.train(
    data_stats['X_train'],
    data_stats['y_train'],
    data_stats['X_test'],
    data_stats['y_test'],
    epochs=5,
    batch_size=32,
    lr=0.001
)
print("   ✓ 模型训练完成")

print("\n4. 执行流量预测...")
recent_data = df['flow'].values[-72:]
prediction = predictor.predict(
    recent_data,
    data_stats['mean'],
    data_stats['std'],
    n_samples=50
)
print(f"   ✓ 预测值: {[round(v, 1) for v in prediction['mean']]}")
print(f"   ✓ 置信区间下界: {[round(v, 1) for v in prediction['lower']]}")
print(f"   ✓ 置信区间上界: {[round(v, 1) for v in prediction['upper']]}")

print("\n5. 交通仿真测试...")
engine = TrafficSimulationEngine()
print(f"   ✓ 信号周期: {engine.config.cycle_length}秒")
for phase in engine.config.phases:
    print(f"     - {phase.name}: 绿灯{phase.green_time}秒, 黄灯{phase.yellow_time}秒, 红灯{phase.red_time}秒")

print("\n6. 信号配时方案评估...")
baseline_times = {p.name: p.green_time for p in engine.config.phases}
optimized_times = {
    '南北直行': 35,
    '南北左转': 15,
    '东西直行': 35,
    '东西左转': 15
}

results = evaluate_signal_timing(baseline_times, optimized_times, prediction['mean'] * 10)
print(f"   ✓ 基准方案 - 平均等待时间: {results['baseline']['average_wait_time']:.2f}秒")
print(f"   ✓ 优化方案 - 平均等待时间: {results['optimized']['average_wait_time']:.2f}秒")
print(f"   ✓ 改善幅度: {results['improvements']['average_wait_time']:.2f}%")
print(f"   ✓ 基准方案 - 通过车辆数: {results['baseline']['throughput']}辆")
print(f"   ✓ 优化方案 - 通过车辆数: {results['optimized']['throughput']}辆")
print(f"   ✓ 吞吐量改善: {results['improvements']['throughput']:.2f}%")

print("\n" + "=" * 60)
print("✓ 所有测试通过！系统功能正常")
print("=" * 60)
