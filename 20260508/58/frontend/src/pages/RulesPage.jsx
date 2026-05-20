import React, { useState, useEffect } from 'react';
import axios from 'axios';

function RulesPage() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    serviceName: '*',
    condition: 'error_rate_gt',
    threshold: 5,
    severity: 'warning',
    webhookUrl: '',
    cooldownMs: 60000,
    enabled: true
  });

  const conditions = [
    { value: 'error_rate_gt', label: '错误率 >' },
    { value: 'error_rate_lt', label: '错误率 <' },
    { value: 'latency_p95_gt', label: 'P95 延迟 > (ms)' },
    { value: 'latency_p99_gt', label: 'P99 延迟 > (ms)' },
    { value: 'request_count_lt', label: '请求数 <' }
  ];

  const severities = [
    { value: 'critical', label: '严重' },
    { value: 'warning', label: '警告' },
    { value: 'info', label: '信息' }
  ];

  const cooldownPresets = [
    { value: 10000, label: '10 秒' },
    { value: 30000, label: '30 秒' },
    { value: 60000, label: '1 分钟' },
    { value: 300000, label: '5 分钟' },
    { value: 600000, label: '10 分钟' },
    { value: 1800000, label: '30 分钟' }
  ];

  const fetchRules = async () => {
    try {
      const response = await axios.get('/api/v1/alerts/rules');
      setRules(response.data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingRule) {
        await axios.put(`/api/v1/alerts/rules/${editingRule.id}`, formData);
      } else {
        await axios.post('/api/v1/alerts/rules', formData);
      }
      setShowForm(false);
      setEditingRule(null);
      resetForm();
      fetchRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      serviceName: rule.serviceName,
      condition: rule.condition,
      threshold: rule.threshold,
      severity: rule.severity,
      webhookUrl: rule.webhookUrl || '',
      cooldownMs: rule.cooldownMs || 60000,
      enabled: rule.enabled
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('确定要删除此规则吗？')) {
      try {
        await axios.delete(`/api/v1/alerts/rules/${id}`);
        fetchRules();
      } catch (error) {
        console.error('Failed to delete rule:', error);
      }
    }
  };

  const handleToggleEnabled = async (rule) => {
    try {
      await axios.put(`/api/v1/alerts/rules/${rule.id}`, {
        enabled: !rule.enabled
      });
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      serviceName: '*',
      condition: 'error_rate_gt',
      threshold: 5,
      severity: 'warning',
      webhookUrl: '',
      cooldownMs: 60000,
      enabled: true
    });
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical': return <span className="severity-badge severity-critical">严重</span>;
      case 'warning': return <span className="severity-badge severity-warning">警告</span>;
      default: return <span className="severity-badge severity-info">信息</span>;
    }
  };

  const getConditionLabel = (condition) => {
    const cond = conditions.find(c => c.value === condition);
    return cond ? cond.label : condition;
  };

  const formatCooldown = (ms) => {
    if (ms < 60000) return `${ms / 1000} 秒`;
    if (ms < 3600000) return `${ms / 60000} 分钟`;
    return `${ms / 3600000} 小时`;
  };

  return (
    <div className="rules-container">
      <div className="rules-header">
        <h1 className="page-title" style={{ margin: 0 }}>告警规则</h1>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + 新建规则
        </button>
      </div>

      {showForm && (
        <form className="rule-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>规则名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如：服务错误率过高"
                required
              />
            </div>
            <div className="form-group">
              <label>目标服务</label>
              <input
                type="text"
                value={formData.serviceName}
                onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                placeholder="输入服务名或 * 表示所有服务"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>条件</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              >
                {conditions.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>阈值</label>
              <input
                type="number"
                value={formData.threshold}
                onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
                step="0.01"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>严重程度</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                {severities.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>冷却时间</label>
              <select
                value={formData.cooldownMs}
                onChange={(e) => setFormData({ ...formData, cooldownMs: parseInt(e.target.value) })}
              >
                {cooldownPresets.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Webhook URL (可选)</label>
              <input
                type="url"
                value={formData.webhookUrl}
                onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                placeholder="https://example.com/webhook"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="switch">
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <span className="slider"></span>
            </label>
            <span style={{ marginLeft: '60px', color: '#94a3b8' }}>启用规则</span>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setShowForm(false);
                setEditingRule(null);
                resetForm();
              }}
            >
              取消
            </button>
            <button type="submit" className="btn btn-primary">
              {editingRule ? '保存修改' : '创建规则'}
            </button>
          </div>
        </form>
      )}

      <table className="rules-table">
        <thead>
          <tr>
            <th>规则名称</th>
            <th>目标服务</th>
            <th>条件</th>
            <th>严重程度</th>
            <th>冷却时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {rules.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                暂无告警规则
              </td>
            </tr>
          ) : (
            rules.map(rule => (
              <tr key={rule.id}>
                <td>{rule.name}</td>
                <td>{rule.serviceName}</td>
                <td>{getConditionLabel(rule.condition)} {rule.threshold}</td>
                <td>{getSeverityBadge(rule.severity)}</td>
                <td>{formatCooldown(rule.cooldownMs || 60000)}</td>
                <td>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleEnabled(rule)}
                    />
                    <span className="slider"></span>
                  </label>
                </td>
                <td>
                  <button
                    className="btn btn-secondary"
                    style={{ marginRight: '8px', padding: '4px 12px' }}
                    onClick={() => handleEdit(rule)}
                  >
                    编辑
                  </button>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '4px 12px' }}
                    onClick={() => handleDelete(rule.id)}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default RulesPage;
