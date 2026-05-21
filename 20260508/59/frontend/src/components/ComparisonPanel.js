import React from 'react';
import { Row, Col, Card, Table, Tag, Progress } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';

const ComparisonPanel = ({ data }) => {
  if (!data) {
    return (
      <div className="chart-container">
        <h3>📊 优化效果对比</h3>
        <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
          请先调整信号配时并运行仿真评估
        </p>
      </div>
    );
  }

  const { baseline, optimized, improvements } = data;

  const formatValue = (value, unit = '') => {
    if (typeof value === 'number') {
      return `${value.toFixed(2)}${unit}`;
    }
    return `${value}${unit}`;
  };

  const statItems = [
    {
      key: 'average_wait_time',
      label: '平均等待时间',
      unit: '秒',
      isBetter: 'lower',
      baseline: baseline.average_wait_time,
      optimized: optimized.average_wait_time,
      improvement: improvements.average_wait_time
    },
    {
      key: 'max_wait_time',
      label: '最大等待时间',
      unit: '秒',
      isBetter: 'lower',
      baseline: baseline.max_wait_time,
      optimized: optimized.max_wait_time,
      improvement: improvements.max_wait_time
    },
    {
      key: 'total_wait_time',
      label: '总等待时间',
      unit: '秒',
      isBetter: 'lower',
      baseline: baseline.total_wait_time,
      optimized: optimized.total_wait_time,
      improvement: improvements.total_wait_time
    },
    {
      key: 'throughput',
      label: '通过车辆数',
      unit: '辆',
      isBetter: 'higher',
      baseline: baseline.throughput,
      optimized: optimized.throughput,
      improvement: improvements.throughput
    },
    {
      key: 'average_queue_length',
      label: '平均排队长度',
      unit: '辆',
      isBetter: 'lower',
      baseline: baseline.average_queue_length,
      optimized: optimized.average_queue_length,
      improvement: improvements.average_queue_length
    }
  ];

  const columns = [
    {
      title: '指标',
      dataIndex: 'label',
      key: 'label',
      width: 150,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '当前配时',
      dataIndex: 'baseline',
      key: 'baseline',
      width: 150,
      render: (value, record) => (
        <span style={{ color: '#fa8c16', fontWeight: 'bold' }}>
          {formatValue(value, record.unit)}
        </span>
      )
    },
    {
      title: '优化配时',
      dataIndex: 'optimized',
      key: 'optimized',
      width: 150,
      render: (value, record) => (
        <span style={{ color: '#52c41a', fontWeight: 'bold' }}>
          {formatValue(value, record.unit)}
        </span>
      )
    },
    {
      title: '改善幅度',
      dataIndex: 'improvement',
      key: 'improvement',
      render: (value, record) => {
        const isPositive = (record.isBetter === 'lower' && value > 0) || 
                          (record.isBetter === 'higher' && value > 0);
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPositive ? (
              <Tag color="success" icon={<ArrowDownOutlined />}>
                优化 +{value.toFixed(1)}%
              </Tag>
            ) : (
              <Tag color="red" icon={<ArrowUpOutlined />}>
                恶化 {value.toFixed(1)}%
              </Tag>
            )}
            <Progress
              percent={Math.abs(value)}
              status={isPositive ? 'success' : 'exception'}
              showInfo={false}
              style={{ width: 100 }}
            />
          </div>
        );
      }
    }
  ];

  const avgImprovement = statItems
    .filter(item => item.improvement)
    .reduce((sum, item) => sum + (item.isBetter === 'lower' ? item.improvement : item.improvement), 0) / statItems.length;

  return (
    <div className="chart-container">
      <h3>📊 优化效果对比</h3>
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <div className={`stats-card ${avgImprovement < 0 ? 'negative' : ''}`}>
            <div className="value">
              {avgImprovement > 0 ? '+' : ''}{avgImprovement.toFixed(1)}%
            </div>
            <div className="label">综合改善率</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div className="stats-card">
            <div className="value">{baseline.total_vehicles}</div>
            <div className="label">仿真车辆总数</div>
          </div>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <div className="stats-card">
            <div className="value">{baseline.cycle_length}s</div>
            <div className="label">信号周期长度</div>
          </div>
        </Col>
      </Row>

      <Table
        dataSource={statItems}
        columns={columns}
        pagination={false}
        rowKey="key"
        bordered
      />

      <div style={{ marginTop: 24, padding: 16, background: '#f6ffed', borderRadius: 8 }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#389e0d' }}>💡 优化建议</h4>
        <p style={{ margin: 0, color: '#595959', fontSize: 14 }}>
          根据预测的交通流量，调整各方向绿灯时长可有效降低路口等待时间。
          {avgImprovement > 0 
            ? `当前优化方案预计可使平均等待时间降低 ${improvements.average_wait_time.toFixed(1)}%，建议采纳。`
            : '当前方案效果不佳，建议增加流量较高方向的绿灯时长。'
          }
        </p>
      </div>
    </div>
  );
};

export default ComparisonPanel;
