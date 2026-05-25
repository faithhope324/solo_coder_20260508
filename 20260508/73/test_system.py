import requests
import time
import json

print("=" * 60)
print("系统完整性测试")
print("=" * 60)
print()

time.sleep(3)

print("1. 测试健康检查接口...")
success = False
for i in range(10):
    try:
        response = requests.get('http://localhost:8000/api/health', timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("   状态码:", response.status_code)
            print("   响应:", data)
            success = True
            break
        else:
            print("   尝试", i+1, "/10:", response.status_code)
            time.sleep(2)
    except Exception as e:
        print("   尝试", i+1, "/10:", str(e))
        time.sleep(2)

if not success:
    print("   错误: 无法连接到后端服务")
    print()
    print("请确保后端服务已启动:")
    print("  cd backend")
    print("  python -m uvicorn main:app --host 0.0.0.0 --port 8000")
    exit(1)

print()

print("2. 测试前端页面...")
try:
    response = requests.get('http://localhost:8000/', timeout=5)
    if response.status_code == 200:
        content = response.text
        if '场景文字识别与翻译系统' in content:
            print("   前端页面加载成功")
            print("   页面包含标题正确")
        else:
            print("   页面内容不正确")
    else:
        print("   状态码:", response.status_code)
except Exception as e:
    print("   错误:", str(e))

print()

print("3. 测试语言列表接口...")
try:
    response = requests.get('http://localhost:8000/api/languages', timeout=5)
    if response.status_code == 200:
        data = response.json()
        src_langs = [lang["name"] for lang in data["source_languages"]]
        tgt_langs = [lang["name"] for lang in data["target_languages"]]
        print("   源语言:", len(src_langs), "种")
        print("   目标语言:", len(tgt_langs), "种")
    else:
        print("   状态码:", response.status_code)
except Exception as e:
    print("   错误:", str(e))

print()

print("4. 测试翻译接口...")
try:
    data = {'text': '出口', 'source_lang': 'zh', 'target_lang': 'en'}
    response = requests.post('http://localhost:8000/api/translate', data=data, timeout=10)
    if response.status_code == 200:
        result = response.json()
        print("   原文:", result["original"])
        print("   译文:", result["translated"])
    else:
        print("   状态码:", response.status_code)
        print("   响应:", response.text)
except Exception as e:
    print("   错误:", str(e))

print()

print("=" * 60)
print("所有基础测试完成！")
print("=" * 60)
print()
print("现在您可以打开浏览器访问: http://localhost:8000")
print("即可使用场景文字识别与翻译系统")
print()
