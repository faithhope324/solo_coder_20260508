import React, { useState } from 'react';
import { Row, Col, Slider, Button, Table, Card, Space, Divider } from 'antd';
import { ThunderboltOutlined } from '@ant-design/icons';

const SignalControlPanel = ({ phases, baselineTimes, optimizedTimes, onOptimizedChange, onEvaluate, loading }) => {
  const handleGreenTimeChange = (phaseName, value) => {
    const newTimes = { ...optimizedTimes };
    newTimes[phaseName] = value;
    onOptimizedChange(newTimes);
  };

  const columns = [
    {
      title: '信号相位',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '当前配时 (秒)',
      dataIndex: 'baseline',
      key: 'baseline',
      width: 120,
      render: (_, record) => (
        <span style={{ color: '#1890ff', fontWeight: 'bold' }}>
          {baselineTimes[record.name] || record.green_time}s
        </span>
      )
    },
    {
      title: '优化配时 (秒)',
      dataIndex: 'optimized',
      key: 'optimized',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Slider
            min={10}
            max={60}
            value={optimizedTimes[record.name] || record.green_time}
            onChange={(value) => handleGreenTimeChange(record.name, value)}
            style={{ flex: 1, maxWidth: 300 }}
            marks={{
              10: '10',
              30: '30',
              60: '60'
            }}
          />
          <span style={{ 
            minWidth: 50, 
            color: '#52c41a', 
            fontWeight: 'bold',
            fontSize: 16
          }}>
            {optimizedTimes[record.name] || record.green_time}s
          </span>
        </div>
      )
    }
  ];

  const baselineTotal = Object.values(baselineTimes).reduce((a, b) => a + b, 0) + phases.length * 3;
  const optimizedTotal = Object.values(optimizedTimes).reduce((a, b) => a + b, 0) + phases.length * 3;

  return (
    <div className="control-panel">
      <h3 style={{ marginTop: 0 }}>🎛️ 信号配时调整</h3>
      <p style={{ color: '#666', marginBottom: 24 }}>
        调整各相位的绿灯时长，系统将通过交通仿真评估优化效果。黄灯固定为3秒。
      </p>
      
      <Table
        dataSource={phases}
        columns={columns}
        pagination={false}
        rowKey="name"
        bordered
      />

      <Divider />

      <Row gutter={16} align="middle">
        <Col>
          <Card size="small" style={{ textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: 12, color: '#666' }}>当前周期长度</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>{baselineTotal}s</div>
          </Card>
        </Col>
        <Col>
          <Card size="small" style={{ textAlign: 'center', minWidth: 150 }}>
            <div style={{ fontSize: 12, color: '#666' }}>优化后周期</div>
            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{optimizedTotal}s</div>
          </Card>
        </Col>
        <Col flex="auto" style={{ textAlign: 'right' }}>
          <Space>
            <Button
              type="primary"
              size="large"
              icon={<ThunderboltOutlined />}
              onClick={onEvaluate}
              loading={loading}
            >
              运行仿真评估
            </Button>
          </Space>
        </Col>
      </Row>
    </div>
  );
};

export default SignalControlPanel;
