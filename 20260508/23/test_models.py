import pandas as pd
import numpy as np
from utils.arima_model import ARIMAForecaster
from utils.prophet_model import ProphetForecaster

print("=" * 50)
print("测试ARIMA模型")
print("=" * 50)

dates = pd.date_range('2023-01-01', periods=50)
values = np.linspace(100, 200, 50) + np.random.randn(50) * 5
df = pd.DataFrame({'date': dates, 'value': values})

print(f"测试数据: {len(df)} 条")
forecaster = ARIMAForecaster()
result = forecaster.train(df)
print(f"训练结果: {result}")

if result['success']:
    pred_result = forecaster.predict(10)
    print(f"预测结果成功: {len(pred_result['dates'])}个预测值")
    print(f"前3个预测值: {pred_result['values'][:3]}")
else:
    print(f"ARIMA训练失败: {result.get('error')}")

print("\n" + "=" * 50)
print("测试Prophet模型")
print("=" * 50)

prophet_forecaster = ProphetForecaster()
prophet_result = prophet_forecaster.train(df)
print(f"训练结果: {prophet_result}")

if prophet_result['success']:
    prophet_pred = prophet_forecaster.predict(10)
    print(f"预测结果成功: {len(prophet_pred['dates'])}个预测值")
    print(f"前3个预测值: {prophet_pred['values'][:3]}")
else:
    print(f"Prophet训练失败: {prophet_result.get('error')}")

print("\n" + "=" * 50)
print("测试完成")
print("=" * 50)
