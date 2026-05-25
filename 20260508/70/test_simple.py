import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(line_buffering=True)

print("测试 ARIMA 模型...")

from src.data_loader import DataLoader
loader = DataLoader()
df = loader.load_csv('data/sample_sales_data.csv')
print(f"数据加载完成: {len(df)} 条")

from statsmodels.tsa.arima.model import ARIMA
import pandas as pd

series = loader.get_time_series()
print(f"时间序列长度: {len(series)}")

print("开始训练 ARIMA(1,1,1)...")
model = ARIMA(series, order=(1, 1, 1))
result = model.fit()
print("训练完成!")

print("开始预测...")
forecast = result.get_forecast(steps=7)
forecast_df = forecast.summary_frame(alpha=0.05)
print(forecast_df)

print("\n✅ ARIMA 测试通过!")
