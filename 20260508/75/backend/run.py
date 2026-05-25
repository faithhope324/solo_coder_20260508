from app import create_app
import warnings

warnings.filterwarnings('ignore')

app = create_app()

if __name__ == '__main__':
    print("=" * 60)
    print("文本摘要与关键词提取系统 - 后端服务")
    print("=" * 60)
    print("服务地址: http://localhost:5000")
    print("API文档: http://localhost:5000/")
    print("=" * 60)
    print("\n正在启动服务...\n")
    
    app.run(host='0.0.0.0', port=5000, debug=True, use_reloader=False)
