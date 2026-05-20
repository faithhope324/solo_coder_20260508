import React, { useState, useEffect } from 'react';
import { Card, List, Tag, Button, Space, Spin, Alert, Collapse, Table, Statistic, Row, Col } from 'antd';
import {
  BulbOutlined,
  ThunderboltOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { getSavingsSuggestions } from '../services/api';

const { Panel } = Collapse;

const priorityColors = {
  high: 'red',
  medium: 'orange',
  low: 'green'
};

const priorityLabels = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级'
};

const typeIcons = {
  idle: <ThunderboltOutlined />,
  stopped: <CloudServerOutlined />,
  reserved: <SafetyOutlined />,
  storage: <DatabaseOutlined />,
  downsize: <CloudServerOutlined />
};

const Savings = () => {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getSavingsSuggestions();
        setSuggestions(data);
        setError(null);
      } catch (err) {
        setError('数据加载失败，请检查后端服务是否正常启动');
        console.error('加载数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalSavings = suggestions.reduce((sum, s) => sum + s.monthlySavings, 0);

  const instanceColumns = [
    {
      title: '实例ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '实例名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'CPU使用率',
      dataIndex: 'cpuUsage',
      key: 'cpuUsage',
      render: (text) => `${text}%`,
    },
    {
      title: '日费用',
      dataIndex: 'dailyCost',
      key: 'dailyCost',
      render: (text) => `¥${text}`,
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (error) {
    return <Alert message="错误" description={error} type="error" showIcon />;
  }

  return (
    <div>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="优化建议数量"
              value={suggestions.length}
              prefix={<BulbOutlined />}
              suffix="条"
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card>
            <Statistic
              title="预计月节省金额"
              value={totalSavings}
              prefix="¥"
              suffix="/月"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={suggestions}
        renderItem={(item) => (
          <List.Item>
            <Card
              actions={[
                <Button type="primary" size="small">
                  立即优化
                </Button>
              ]}
            >
              <Card.Meta
                avatar={
                  <div style={{
                    fontSize: 24,
                    color: priorityColors[item.priority]
                  }}>
                    {typeIcons[item.type] || <BulbOutlined />}
                  </div>
                }
                title={
                  <Space>
                    {item.title}
                    <Tag color={priorityColors[item.priority]}>
                      {priorityLabels[item.priority]}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <p style={{ marginBottom: 8 }}>{item.description}</p>
                    <p style={{ color: '#52c41a', marginBottom: 8 }}>
                      <strong>预计月节省: ¥{item.monthlySavings}</strong>
                    </p>
                    <p style={{ color: '#1890ff' }}>{item.action}</p>
                    
                    {item.instances && item.instances.length > 0 && (
                      <Collapse style={{ marginTop: 16 }}>
                        <Panel header="查看相关实例" key="1">
                          <Table
                            dataSource={item.instances}
                            columns={instanceColumns}
                            pagination={false}
                            size="small"
                          />
                        </Panel>
                      </Collapse>
                    )}
                    
                    {item.instanceCount && (
                      <p style={{ marginTop: 8, color: '#666' }}>
                        涉及实例数: {item.instanceCount} 台
                      </p>
                    )}
                    
                    {item.totalStorage && (
                      <p style={{ marginTop: 8, color: '#666' }}>
                        存储总量: {item.totalStorage} GB
                      </p>
                    )}
                  </div>
                }
              />
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default Savings;
