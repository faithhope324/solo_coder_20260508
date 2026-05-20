import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function ServicePanel({ serviceName, details, errorTraces, loading }) {
  if (!serviceName) {
    return (
      <div className="service-panel">
        <div className="service-panel-empty">
          <div>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👆</div>
            <div>点击拓扑图中的服务节点<br />查看详细信息</div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="service-panel">
        <div className="service-panel-empty">加载中...</div>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="service-panel">
        <div className="service-panel-empty">暂无数据</div>
      </div>
    );
  }

  const latencyData = [
    { name: 'P50', value: details.latency.p50 },
    { name: 'P90', value: details.latency.p90 },
    { name: 'P95', value: details.latency.p95 },
    { name: 'P99', value: details.latency.p99 }
  ];

  const getErrorRateClass = (rate) => {
    if (rate > 10) return 'error';
    if (rate > 5) return 'warning';
    return 'success';
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  return (
    <div className="service-panel">
      <h2 style={{ marginBottom: '20px', fontSize: '18px' }}>{serviceName}</h2>

      <div className="stat-card">
        <div className="stat-label">总请求数</div>
        <div className="stat-value">{details.totalRequests}</div>
      </div>

      <div className="stat-card">
        <div className="stat-label">错误率</div>
        <div className={`stat-value ${getErrorRateClass(details.errorRate)}`}>
          {details.errorRate}%
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-label">平均延迟</div>
        <div className="stat-value">{Math.round(details.latency.avg)} ms</div>
      </div>

      <div className="latency-chart">
        <div className="chart-title">延迟分位数</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={latencyData}>
            <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#e2e8f0'
              }}
              formatter={(value) => [`${value} ms`, '延迟']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {latencyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#3b82f6" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="error-traces">
        <div className="chart-title">最近错误追踪 ({errorTraces.length})</div>
        {errorTraces.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '20px 0' }}>
            暂无错误
          </div>
        ) : (
          errorTraces.map((trace, index) => (
            <div key={index} className="error-trace-item">
              <div className="error-trace-operation">{trace.operationName}</div>
              <div className="error-trace-message">{trace.error}</div>
              <div className="error-trace-time">
                {formatTime(trace.startTime)} · {trace.duration}ms
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ServicePanel;
