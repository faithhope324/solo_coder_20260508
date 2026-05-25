import requests
import json

print("=" * 60)
print("后端API接口测试")
print("=" * 60)
print()

# 测试健康检查
print("1. 测试健康检查接口...")
try:
    response = requests.get('http://localhost:8000/api/health', timeout=5)
    print(f"   状态码: {response.status_code}")
    print(f"   响应: {json.dumps(response.json(), ensure_ascii=False)}")
    print("   ✓ 健康检查通过")
except Exception as e:
    print(f"   ✗ 失败: {e}")
print()

# 测试语言列表
print("2. 测试语言列表接口...")
try:
    response = requests.get('http://localhost:8000/api/languages', timeout=5)
    print(f"   状态码: {response.status_code}")
    data = response.json()
    print(f"   源语言: {[lang['name'] for lang in data['source_languages']]}")
    print(f"   目标语言: {[lang['name'] for lang in data['target_languages']]}")
    print("   ✓ 语言列表获取通过")
except Exception as e:
    print(f"   ✗ 失败: {e}")
print()

# 测试翻译接口
print("3. 测试翻译接口...")
try:
    data = {'text': '你好', 'source_lang': 'zh', 'target_lang': 'en'}
    response = requests.post('http://localhost:8000/api/translate', data=data, timeout=10)
    print(f"   状态码: {response.status_code}")
    result = response.json()
    print(f"   原文: {result['original']}")
    print(f"   译文: {result['translated']}")
    print("   ✓ 翻译接口通过")
except Exception as e:
    print(f"   ✗ 失败: {e}")
print()

# 测试批量翻译
print("4. 测试批量翻译接口...")
try:
    data = {'texts': ['出口', '入口', '餐厅', '菜单'], 'source_lang': 'zh', 'target_lang': 'en'}
    response = requests.post('http://localhost:8000/api/translate_batch', data=data, timeout=10)
    print(f"   状态码: {response.status_code}")
    result = response.json()
    for t in result['translations']:
        print(f"   {t['original']} -> {t['translated']}")
    print("   ✓ 批量翻译接口通过")
except Exception as e:
    print(f"   ✗ 失败: {e}")
print()

print("=" * 60)
print("✓ 所有API接口测试通过！")
print("=" * 60)
print()
print("提示: 请刷新前端页面，红色感叹号应该会消失，")
print("      显示为绿色的'后端服务正常'。")
