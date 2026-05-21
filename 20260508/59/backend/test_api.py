import urllib.request
import json

print("测试后端API...")

try:
    with urllib.request.urlopen('http://127.0.0.1:5000/api/health') as response:
        data = json.loads(response.read().decode())
        print(f"✓ 健康检查: {data}")
except Exception as e:
    print(f"✗ 健康检查失败: {e}")

try:
    req = urllib.request.Request(
        'http://127.0.0.1:5000/api/init',
        data=json.dumps({}).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    print("\n正在初始化系统并训练模型（这可能需要几分钟）...")
    with urllib.request.urlopen(req, timeout=300) as response:
        data = json.loads(response.read().decode())
        print(f"✓ 初始化完成: {data}")
except Exception as e:
    print(f"✗ 初始化失败: {e}")

try:
    with urllib.request.urlopen('http://127.0.0.1:5000/api/signal-phases') as response:
        data = json.loads(response.read().decode())
        print(f"\n✓ 信号相位:")
        for phase in data['phases']:
            print(f"  - {phase['name']}: 绿灯{phase['green_time']}秒")
except Exception as e:
    print(f"✗ 获取信号相位失败: {e}")

try:
    with urllib.request.urlopen('http://127.0.0.1:5000/api/predict') as response:
        data = json.loads(response.read().decode())
        if data['success']:
            print(f"\n✓ 流量预测成功:")
            print(f"  预测值: {[round(v,1) for v in data['prediction']['mean']]}")
except Exception as e:
    print(f"✗ 预测失败: {e}")

print("\n✓ 后端API测试完成")
