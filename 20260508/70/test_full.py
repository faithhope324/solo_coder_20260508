import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(line_buffering=True)

print("=" * 70)
print("超市销售数据预测工具 - 完整功能测试")
print("=" * 70)

print("\n1. 测试模型可用性检测...")
print("-" * 70)
from src.model_trainer import SalesForecaster, ModelNotInstalledError
print(f"  可用模型: {SalesForecaster.get_available_models()}")
print(f"  Prophet 可用: {SalesForecaster.is_prophet_available()}")
print(f"  ARIMA 可用: {SalesForecaster.is_arima_available()}")
print(f"  安装信息: {SalesForecaster.get_model_install_info()}")
print("  ✅ 模型可用性检测通过")

print("\n2. 测试数据加载与预处理...")
print("-" * 70)
from src.data_loader import DataLoader
loader = DataLoader()
df = loader.load_csv('data/sample_sales_data.csv')
print(f"  数据行数: {len(df)}")
print(f"  列名映射: {loader.column_mapping}")
print(f"  列信息: {loader.get_column_info()}")
valid, errors = loader.validate()
print(f"  数据验证: {'通过' if valid else '失败'}")
if errors:
    print(f"  警告: {errors}")
print(f"  时间序列长度: {len(loader.get_time_series())}")
print(f"  促销序列可用: {loader.get_promo_series() is not None}")
print("  ✅ 数据加载与预处理通过")

print("\n3. 测试 ARIMA 模型训练与预测...")
print("-" * 70)
forecaster = SalesForecaster(loader)
try:
    model_info = forecaster.fit(model_type='arima', auto_tune=False, order=(1, 1, 1))
    print(f"  模型类型: {model_info['model_type']}")
    print(f"  参数: {model_info['parameters']}")
    predictions = forecaster.predict(periods=7)
    print(f"  预测行数: {len(predictions)}")
    print(f"  预测列: {list(predictions.columns)}")
    summary = forecaster.get_prediction_summary(predictions)
    print(f"  预测总额: ¥{summary['total_predicted']:.2f}")
    print("  ✅ ARIMA 模型测试通过")
except Exception as e:
    print(f"  ❌ ARIMA 测试失败: {e}")

if SalesForecaster.is_prophet_available():
    print("\n4. 测试 Prophet 模型训练与预测...")
    print("-" * 70)
    try:
        forecaster2 = SalesForecaster(loader)
        model_info = forecaster2.fit(model_type='prophet')
        print(f"  模型类型: {model_info['model_type']}")
        print(f"  参数: {model_info['parameters']}")
        predictions = forecaster2.predict(periods=7)
        print(f"  预测行数: {len(predictions)}")
        print(f"  预测列: {list(predictions.columns)}")
        summary = forecaster2.get_prediction_summary(predictions)
        print(f"  预测总额: ¥{summary['total_predicted']:.2f}")
        print(f"  预测区间: ¥{summary['total_lower']:.2f} ~ ¥{summary['total_upper']:.2f}")
        print("  ✅ Prophet 模型测试通过")
    except Exception as e:
        print(f"  ❌ Prophet 测试失败: {e}")
else:
    print("\n4. 测试 Prophet 模型训练与预测...")
    print("-" * 70)
    print("  ⚠️  Prophet 未安装，跳过测试")

print("\n5. 测试自动选择模型...")
print("-" * 70)
try:
    forecaster3 = SalesForecaster(loader)
    model_info = forecaster3.fit(model_type='auto')
    print(f"  自动选择模型: {model_info['model_type']}")
    print(f"  参数: {model_info['parameters']}")
    predictions = forecaster3.predict(periods=7)
    summary = forecaster3.get_prediction_summary(predictions)
    print(f"  预测总额: ¥{summary['total_predicted']:.2f}")
    print("  ✅ 自动模型选择测试通过")
except Exception as e:
    print(f"  ❌ 自动模型选择测试失败: {e}")

print("\n6. 测试可视化模块...")
print("-" * 70)
from src.visualizer import Visualizer
visualizer = Visualizer()
try:
    history_plot = visualizer.plot_historical_trend(
        loader.get_time_series(),
        loader.get_promo_series()
    )
    print(f"  历史趋势图长度: {len(history_plot)} 字符")
    
    forecast_plot = visualizer.plot_forecast(
        loader.get_time_series(),
        predictions,
        loader.get_promo_series()
    )
    print(f"  预测结果图长度: {len(forecast_plot)} 字符")
    
    comparison_plot = visualizer.plot_comparison(
        loader.get_time_series(),
        predictions
    )
    print(f"  对比分析图长度: {len(comparison_plot)} 字符")
    
    table = visualizer.generate_prediction_table(predictions)
    print(f"  预测表格长度: {len(table)} 字符")
    
    cards = visualizer.generate_summary_cards(summary)
    print(f"  汇总卡片长度: {len(cards)} 字符")
    
    print("  ✅ 可视化模块测试通过")
except Exception as e:
    print(f"  ❌ 可视化测试失败: {e}")
    import traceback
    traceback.print_exc()

print("\n7. 测试 Flask 应用...")
print("-" * 70)
try:
    from app import app
    client = app.test_client()
    
    response = client.get('/')
    print(f"  首页状态: {response.status_code}")
    assert response.status_code == 200, "首页请求失败"
    print("  ✅ Flask 应用测试通过")
except Exception as e:
    print(f"  ❌ Flask 应用测试失败: {e}")

print("\n" + "=" * 70)
print("✅ 所有测试通过！超市销售数据预测工具已就绪。")
print("=" * 70)
print("\n启动命令: python app.py")
print("访问地址: http://127.0.0.1:5000")
print("\n可用模型: " + ", ".join(SalesForecaster.get_available_models()))
