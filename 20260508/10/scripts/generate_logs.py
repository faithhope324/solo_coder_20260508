import csv
import random
from datetime import datetime, timedelta
import os

# 生成模拟日志数据
def generate_logs(output_file, num_records=1000000):
    # 可能的请求路径
    paths = [
        "/api/users", "/api/products", "/api/orders", "/api/payments",
        "/api/login", "/api/logout", "/api/profile", "/api/search"
    ]
    
    # 可能的状态码
    status_codes = [200, 201, 400, 401, 404, 500]
    
    # 使用今天的日期作为基准时间，确保生成的数据是当天的
    today = datetime.now().date()
    base_time = datetime(today.year, today.month, today.day, 0, 0, 0)
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # 写入表头
        writer.writerow(['timestamp', 'path', 'response_time', 'status_code'])
        
        for i in range(num_records):
            # 随机时间（过去24小时内）
            random_seconds = random.randint(0, 24 * 3600)
            timestamp = base_time + timedelta(seconds=random_seconds)
            
            # 随机路径
            path = random.choice(paths)
            
            # 随机响应时间（10ms到5000ms）
            response_time = random.uniform(0.01, 5.0)
            
            # 随机状态码（大部分是200）
            if random.random() < 0.8:
                status_code = 200
            else:
                status_code = random.choice(status_codes)
            
            # 写入记录
            writer.writerow([
                timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                path,
                round(response_time, 3),
                status_code
            ])
            
            # 每100000条记录显示进度
            if (i + 1) % 100000 == 0:
                print(f"Generated {i + 1}/{num_records} records")

if __name__ == "__main__":
    output_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "logs.csv")
    print(f"Generating logs to {output_file}")
    generate_logs(output_file, num_records=1000000)
    print("Log generation completed!")