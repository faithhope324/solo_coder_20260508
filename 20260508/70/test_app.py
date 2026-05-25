import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(line_buffering=True)

print("=" * 50)
print("测试模块导入...")
print("=" * 50)

try:
    from src.data_loader import DataLoader
    print("✅ DataLoader 导入成功")
except Exception as e:
    print(f"❌ DataLoader 导入失败: {e}")
    sys.exit(1)

try:
    from src.model_trainer import SalesForecaster
    print("✅ SalesForecaster 导入成功")
except Exception as e:
    print(f"❌ SalesForecaster 导入失败: {e}")

try:
    from src.visualizer import Visualizer
    print("✅ Visualizer 导入成功")
except Exception as e:
    print(f"❌ Visualizer 导入失败: {e}")
    sys.exit(1)

print("\n" + "=" * 50)
print("测试数据加载...")
print("=" * 50)

try:
    loader = DataLoader()
    df = loader.load_csv('data/sample_sales_data.csv')
    print(f"✅ 数据加载成功，共 {len(df)} 条记录")
    print(f"   列名映射: {loader.column_mapping}")
    
    valid, errors = loader.validate()
    if errors:
        print(f"   警告信息: {errors}")
    print(f"   数据验证: {'通过' if valid else '失败'}")
except Exception as e:
    print(f"❌ 数据加载失败: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 50)
print("测试 ARIMA 模型训练与预测...")
print("=" * 50)

try:
    forecaster = SalesForecaster(loader)
    model_info = forecaster.fit(model_type='arima', auto_tune=False, order=(1, 1, 1))
    print(f"✅ 模型训练成功")
    print(f"   模型类型: {model_info['model_type']}")
    print(f"   参数: {model_info['parameters']}")
    
    predictions = forecaster.predict(periods=7)
    print(f"✅ 预测成功，未来7天预测结果:")
    print(predictions)
    
    summary = forecaster.get_prediction_summary(predictions)
    print(f"   预测总额: {summary['total_predicted']:.2f}")
except Exception as e:
    print(f"❌ 模型训练或预测失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 50)
print("测试可视化...")
print("=" * 50)

try:
    visualizer = Visualizer()
    history_plot = visualizer.plot_historical_trend(
        loader.get_time_series(),
        loader.get_promo_series()
    )
    print("✅ 历史趋势图生成成功")
    
    forecast_plot = visualizer.plot_forecast(
        loader.get_time_series(),
        predictions,
        loader.get_promo_series()
    )
    print("✅ 预测结果图生成成功")
    
    comparison_plot = visualizer.plot_comparison(
        loader.get_time_series(),
        predictions
    )
    print("✅ 对比分析图生成成功")
    
    table = visualizer.generate_prediction_table(predictions)
    print("✅ 预测表格生成成功")
    
    cards = visualizer.generate_summary_cards(summary)
    print("✅ 汇总卡片生成成功")
except Exception as e:
    print(f"❌ 可视化失败: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 50)
print("✅ 所有基础测试通过！")
print("=" * 50)
