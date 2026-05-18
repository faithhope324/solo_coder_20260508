import requests
import json

BASE_URL = 'http://127.0.0.1:5001'

print("=" * 60)
print("测试ARIMA预测API")
print("=" * 60)

files = {'file': open('sample_data.csv', 'rb')}
response = requests.post(f'{BASE_URL}/api/upload', files=files)
upload_data = response.json()
print(f"上传成功: file_id = {upload_data['file_id']}")
print(f"数据条数: {upload_data['row_count']}")

file_id = upload_data['file_id']

payload = {
    'file_id': file_id,
    'model': 'arima',
    'periods': 30,
    'arima_params': {
        'auto': True,
        'p': 1,
        'd': 1,
        'q': 1
    }
}

response = requests.post(f'{BASE_URL}/api/predict', json=payload)
result = response.json()

if result['success']:
    print("\nARIMA预测成功!")
    print(f"模型参数: p={result['model_info']['parameters']['p']}, d={result['model_info']['parameters']['d']}, q={result['model_info']['parameters']['q']}")
    print(f"AIC: {result['model_info']['aic']}")
    print(f"预测点数: {len(result['forecast']['dates'])}")
    print(f"评估指标: RMSE={result['metrics']['rmse']}, MAE={result['metrics']['mae']}, MAPE={result['metrics']['mape']}%")
    print(f"前3个预测值: {result['forecast']['values'][:3]}")
else:
    print(f"ARIMA预测失败: {result.get('error')}")

print("\n" + "=" * 60)
print("测试Prophet预测API")
print("=" * 60)

payload = {
    'file_id': file_id,
    'model': 'prophet',
    'periods': 30,
    'arima_params': {
        'auto': True,
        'p': 1,
        'd': 1,
        'q': 1
    }
}

response = requests.post(f'{BASE_URL}/api/predict', json=payload)
result = response.json()

if result['success']:
    print("\nProphet预测成功!")
    print(f"预测点数: {len(result['forecast']['dates'])}")
    print(f"评估指标: RMSE={result['metrics']['rmse']}, MAE={result['metrics']['mae']}, MAPE={result['metrics']['mape']}%")
    print(f"前3个预测值: {result['forecast']['values'][:3]}")
else:
    print(f"Prophet预测失败: {result.get('error')}")

print("\n" + "=" * 60)
print("所有API测试完成!")
print("=" * 60)
