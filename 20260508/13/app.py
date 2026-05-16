from datetime import datetime, timedelta
from flask import Flask, render_template, request, jsonify
from init_es import INDEX_NAME, init_index

app = Flask(__name__)

es = init_index()


def get_real_ip():
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        ip_list = [ip.strip() for ip in forwarded_for.split(',')]
        return ip_list[0]
    
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    forwarded = request.headers.get('X-Forwarded')
    if forwarded:
        return forwarded
    
    client_ip = request.headers.get('Client-IP')
    if client_ip:
        return client_ip
    
    return request.remote_addr


def mask_ip(ip):
    if not ip:
        return '***.***.***.***'
    
    if ':' in ip:
        parts = ip.split(':')
        if len(parts) >= 4:
            return ':'.join(parts[:-2]) + ':****:****'
        return ip
    
    parts = ip.split('.')
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.{parts[2]}.***"
    
    return ip


@app.before_request
def log_request():
    if request.endpoint == 'static':
        return
    
    real_ip = get_real_ip()
    masked_ip = mask_ip(real_ip)
    
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'ip': masked_ip,
        'user_agent': request.user_agent.string,
        'path': request.path,
        'method': request.method
    }
    
    es.index(index=INDEX_NAME, document=log_data)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')


@app.route('/api/dashboard-data')
def dashboard_data():
    now = datetime.now()
    one_hour_ago = now - timedelta(hours=1)
    
    now_es = now.strftime('%Y-%m-%dT%H:%M:%S')
    one_hour_ago_es = one_hour_ago.strftime('%Y-%m-%dT%H:%M:%S')
    
    query = {
        'query': {
            'range': {
                'timestamp': {
                    'gte': one_hour_ago_es,
                    'lte': now_es
                }
            }
        },
        'aggs': {
            'requests_over_time': {
                'date_histogram': {
                    'field': 'timestamp',
                    'fixed_interval': '5m',
                    'format': 'HH:mm'
                }
            },
            'top_ips': {
                'terms': {
                    'field': 'ip',
                    'size': 10
                }
            },
            'top_user_agents': {
                'terms': {
                    'field': 'user_agent.keyword',
                    'size': 10
                }
            },
            'top_paths': {
                'terms': {
                    'field': 'path',
                    'size': 10
                }
            },
            'total_requests': {
                'value_count': {
                    'field': 'timestamp'
                }
            }
        }
    }
    
    result = es.search(index=INDEX_NAME, body=query, size=0)
    
    response_data = {
        'requests_over_time': [
            {
                'time': bucket['key_as_string'],
                'count': bucket['doc_count']
            }
            for bucket in result['aggregations']['requests_over_time']['buckets']
        ],
        'top_ips': [
            {
                'ip': bucket['key'],
                'count': bucket['doc_count']
            }
            for bucket in result['aggregations']['top_ips']['buckets']
        ],
        'top_user_agents': [
            {
                'user_agent': bucket['key'],
                'count': bucket['doc_count']
            }
            for bucket in result['aggregations']['top_user_agents']['buckets']
        ],
        'top_paths': [
            {
                'path': bucket['key'],
                'count': bucket['doc_count']
            }
            for bucket in result['aggregations']['top_paths']['buckets']
        ],
        'total_requests': result['aggregations']['total_requests']['value'],
        'current_time': now.isoformat()
    }
    
    return jsonify(response_data)


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
