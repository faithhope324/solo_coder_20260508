import React from 'react';
import { Button, Select, InputNumber, Space, Typography, Card } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

function BoundaryConditions({ conditions, onChange }) {
  const addCondition = () => {
    onChange([
      ...conditions,
      { type: 'force', location: 'right', value: 1000, direction: 'x' }
    ]);
  };

  const updateCondition = (index, field, value) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeCondition = (index) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  const getTypeLabel = (type) => {
    const labels = {
      fixed: '固定约束',
      force: '集中力',
      pressure: '压力'
    };
    return labels[type] || type;
  };

  const getLocationLabel = (loc) => {
    const labels = {
      left: '左边界 (x≈0)',
      right: '右边界 (x≈1)',
      top: '上边界 (y≈0)',
      bottom: '下边界 (y≈1)'
    };
    return labels[loc] || loc;
  };

  return (
    <div>
      <Title level={5} style={{ marginBottom: 12 }}>边界条件设置</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        定义模型的约束和载荷条件
      </Text>

      <div style={{ marginBottom: 16 }}>
        {conditions.map((cond, index) => (
          <Card
            key={index}
            size="small"
            style={{ marginBottom: 8 }}
            extra={
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => removeCondition(index)}
              />
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <span>类型:</span>
                <Select
                  value={cond.type}
                  onChange={v => updateCondition(index, 'type', v)}
                  style={{ width: 100 }}
                  size="small"
                >
                  <Option value="fixed">固定约束</Option>
                  <Option value="force">集中力</Option>
                  <Option value="pressure">压力</Option>
                </Select>
              </Space>
              
              <Space wrap>
                <span>位置:</span>
                <Select
                  value={cond.location}
                  onChange={v => updateCondition(index, 'location', v)}
                  style={{ width: 100 }}
                  size="small"
                >
                  <Option value="left">左边界</Option>
                  <Option value="right">右边界</Option>
                  <Option value="top">上边界</Option>
                  <Option value="bottom">下边界</Option>
                </Select>
              </Space>

              {cond.type !== 'fixed' && (
                <>
                  <Space wrap>
                    <span>值:</span>
                    <InputNumber
                      value={cond.value}
                      onChange={v => updateCondition(index, 'value', v)}
                      style={{ width: 120 }}
                      size="small"
                    />
                    <Text type="secondary">N</Text>
                  </Space>
                  
                  {cond.type === 'force' && (
                    <Space wrap>
                      <span>方向:</span>
                      <Select
                        value={cond.direction}
                        onChange={v => updateCondition(index, 'direction', v)}
                        style={{ width: 80 }}
                        size="small"
                      >
                        <Option value="x">X方向</Option>
                        <Option value="y">Y方向</Option>
                      </Select>
                    </Space>
                  )}
                </>
              )}
            </Space>
          </Card>
        ))}
      </div>

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={addCondition}
        block
      >
        添加边界条件
      </Button>

      <Title level={5} style={{ marginTop: 24, marginBottom: 12 }}>当前设置</Title>
      <div style={{ fontSize: 12 }}>
        {conditions.map((cond, i) => (
          <div key={i} style={{ padding: '4px 0', color: '#666' }}>
            • {getTypeLabel(cond.type)} @ {getLocationLabel(cond.location)}
            {cond.type !== 'fixed' && ` = ${cond.value} N`}
          </div>
        ))}
      </div>
    </div>
  );
}

export default BoundaryConditions;
