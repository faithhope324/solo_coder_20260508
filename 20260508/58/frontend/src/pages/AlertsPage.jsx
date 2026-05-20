import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = async () => {
    try {
      const response = await axios.get('/api/v1/alerts');
      setAlerts(response.data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'critical';
      case 'warning': return 'warning';
      default: return 'info';
    }
  };

  return (
    <div className="alerts-list">
      <h1 className="page-title">告警记录</h1>
      
      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
          暂无告警记录
        </div>
      ) : (
        alerts.map(alert => (
          <div key={alert.id} className={`alert-item ${getSeverityClass(alert.severity)}`}>
            <div className="alert-header">
              <span className="alert-title">{alert.ruleName}</span>
              <span className="alert-time">{formatTime(alert.createdAt)}</span>
            </div>
            <div className="alert-message">{alert.message}</div>
            <div className="alert-meta">
              <span>服务: {alert.serviceName}</span>
              <span>当前值: {alert.currentValue}</span>
              <span>阈值: {alert.threshold}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default AlertsPage;
