import sys
sys.path.insert(0, '.')
from app import app

client = app.test_client()

print('=' * 60)
print('测试ARIMA预测 (通过Flask test client)')
print('=' * 60)

with open('sample_data.csv', 'rb') as f:
    response = client.post('/api/upload', data={'file': (f, 'sample_data.csv')}, content_type='multipart/form-data')
    upload_data = response.get_json()
    print('上传成功: file_id =', upload_data['file_id'])
    print('数据条数:', upload_data['row_count'])

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

print('\n正在训练ARIMA模型并预测...')
response = client.post('/api/predict', json=payload)
result = response.get_json()

if result['success']:
    print()
    print('ARIMA预测成功!')
    params = result['model_info']['parameters']
    print('模型参数: p=%d, d=%d, q=%d' % (params['p'], params['d'], params['q']))
    print('AIC:', result['model_info']['aic'])
    print('预测点数:', len(result['forecast']['dates']))
    print('评估指标: RMSE=%.4f, MAE=%.4f, MAPE=%.2f%%' % (
        result['metrics']['rmse'], 
        result['metrics']['mae'], 
        result['metrics']['mape']
    ))
    print('前3个预测值:', result['forecast']['values'][:3])
else:
    print('ARIMA预测失败:', result.get('error'))

print()
print('=' * 60)
print('测试Prophet预测')
print('=' * 60)

payload['model'] = 'prophet'
print('\n正在训练Prophet模型并预测...')
response = client.post('/api/predict', json=payload)
result = response.get_json()

if result['success']:
    print()
    print('Prophet预测成功!')
    print('预测点数:', len(result['forecast']['dates']))
    print('评估指标: RMSE=%.4f, MAE=%.4f, MAPE=%.2f%%' % (
        result['metrics']['rmse'], 
        result['metrics']['mae'], 
        result['metrics']['mape']
    ))
    print('前3个预测值:', result['forecast']['values'][:3])
else:
    print('Prophet预测失败:', result.get('error'))

print()
print('=' * 60)
print('所有测试完成!')
print('=' * 60)
