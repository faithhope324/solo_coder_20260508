import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

np.random.seed(42)

start_date = datetime(2025, 11, 1)
end_date = datetime(2026, 5, 21)
date_range = pd.date_range(start=start_date, end=end_date, freq='D')
n_days = len(date_range)

base_sales = 5000
trend = np.linspace(0, 800, n_days)

day_of_week = np.array([d.weekday() for d in date_range])
weekly_effect = np.where(day_of_week >= 5, 1.3, 1.0)
weekly_effect[day_of_week == 4] = 1.15

month = np.array([d.month for d in date_range])
holiday_effect = np.ones(n_days)
holiday_effect[(month == 12) & (day_of_week >= 20)] = 1.5
holiday_effect[(month == 1) & (day_of_week <= 7)] = 1.3
holiday_effect[(month == 2) & (day_of_week >= 10) & (day_of_week <= 17)] = 1.4

promo_days = np.random.choice(n_days, size=int(n_days * 0.1), replace=False)
promo = np.zeros(n_days, dtype=int)
promo[promo_days] = 1
promo_effect = np.where(promo == 1, 1.4 + np.random.uniform(0, 0.2, n_days), 1.0)

noise = np.random.normal(0, 300, n_days)

sales = (base_sales + trend) * weekly_effect * holiday_effect * promo_effect + noise
sales = np.maximum(sales, 1000)
sales = np.round(sales, 2)

df = pd.DataFrame({
    '日期': date_range.strftime('%Y-%m-%d'),
    '销售额': sales,
    '促销标记': promo
})

os.makedirs('data', exist_ok=True)
df.to_csv('data/sample_sales_data.csv', index=False, encoding='utf-8-sig')

print(f"示例数据已生成，共 {len(df)} 条记录")
print(f"时间范围: {df['日期'].iloc[0]} 至 {df['日期'].iloc[-1]}")
print(f"平均销售额: {df['销售额'].mean():.2f}")
print(f"促销日数量: {df['促销标记'].sum()}")
print("\n前5条数据:")
print(df.head())
