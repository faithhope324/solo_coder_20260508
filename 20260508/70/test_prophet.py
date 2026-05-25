import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(line_buffering=True)

print("=" * 50)
print("测试 Prophet 模型...")
print("=" * 50)

try:
    from src.data_loader import DataLoader
    loader = DataLoader()
    df = loader.load_csv('data/sample_sales_data.csv')
    print(f"✅ 数据加载成功: {len(df)} 条记录")
    
    from src.model_trainer import SalesForecaster
    forecaster = SalesForecaster(loader)
    
    print("\n开始训练 Prophet 模型...")
    model_info = forecaster.fit(model_type='prophet')
    print(f"✅ Prophet 训练成功")
    print(f"   模型类型: {model_info['model_type']}")
    print(f"   参数: {model_info['parameters']}")
    
    print("\n开始预测未来 7 天...")
    predictions = forecaster.predict(periods=7)
    print("✅ 预测成功!")
    print("\n预测结果:")
    print(predictions)
    
    summary = forecaster.get_prediction_summary(predictions)
    print(f"\n预测总额: ¥{summary['total_predicted']:.2f}")
    print(f"预测区间: ¥{summary['total_lower']:.2f} ~ ¥{summary['total_upper']:.2f}")
    print(f"日均预测: ¥{summary['average_predicted']:.2f}")
    
    print("\n" + "=" * 50)
    print("✅ Prophet 测试通过!")
    print("=" * 50)
    
except ImportError as e:
    print(f"❌ Prophet 未安装: {e}")
    print("\n请运行以下命令安装 Prophet:")
    print("  pip install prophet")
except Exception as e:
    print(f"❌ 测试失败: {e}")
    import traceback
    traceback.print_exc()
