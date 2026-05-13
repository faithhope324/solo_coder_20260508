from flask import Flask, render_template, jsonify
import pymysql

app = Flask(__name__)

# 数据库连接配置
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'password',
    'database': 'spark_logs',
    'cursorclass': pymysql.cursors.DictCursor
}

# 连接数据库
def get_db_connection():
    return pymysql.connect(**db_config)

# 主页路由
@app.route('/')
def index():
    return render_template('index.html')

# 获取每小时指标数据
@app.route('/api/hourly-metrics')
def get_hourly_metrics():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT * FROM log_metrics_hourly ORDER BY date, hour"
            cursor.execute(sql)
            result = cursor.fetchall()
        return jsonify(result)
    finally:
        connection.close()

# 获取每小时路径指标数据
@app.route('/api/path-metrics')
def get_path_metrics():
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            sql = "SELECT * FROM log_metrics_path_hourly ORDER BY date, hour, path"
            cursor.execute(sql)
            result = cursor.fetchall()
        return jsonify(result)
    finally:
        connection.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)