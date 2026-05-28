import React from 'react';
import { InputNumber, Select, Space, Typography, Divider, Slider } from 'antd';

const { Title, Text } = Typography;
const { Option } = Select;

const materialPresets = {
  steel: { name: '钢材', young_modulus: 210e9, poisson_ratio: 0.3, density: 7850 },
  aluminum: { name: '铝合金', young_modulus: 70e9, poisson_ratio: 0.33, density: 2700 },
  copper: { name: '铜', young_modulus: 110e9, poisson_ratio: 0.34, density: 8960 },
  plastic: { name: '塑料', young_modulus: 2e9, poisson_ratio: 0.4, density: 900 },
  glass: { name: '玻璃', young_modulus: 70e9, poisson_ratio: 0.22, density: 2500 },
  custom: { name: '自定义', young_modulus: 0, poisson_ratio: 0, density: 0 }
};

function MaterialProperties({ material, meshSize, onMaterialChange, onMeshSizeChange }) {
  const handlePresetChange = (preset) => {
    if (preset !== 'custom') {
      onMaterialChange(materialPresets[preset]);
    }
  };

  const getCurrentPreset = () => {
    for (const [key, preset] of Object.entries(materialPresets)) {
      if (key !== 'custom' &&
          Math.abs(preset.young_modulus - material.young_modulus) < 1e-6 &&
          Math.abs(preset.poisson_ratio - material.poisson_ratio) < 1e-6 &&
          Math.abs(preset.density - material.density) < 1e-6) {
        return key;
      }
    }
    return 'custom';
  };

  return (
    <div>
      <Title level={5} style={{ marginBottom: 12 }}>材料属性</Title>
      
      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        <Space>
          <span>预设材料:</span>
          <Select
            value={getCurrentPreset()}
            onChange={handlePresetChange}
            style={{ width: 150 }}
          >
            {Object.entries(materialPresets).map(([key, preset]) => (
              <Option key={key} value={key}>{preset.name}</Option>
            ))}
          </Select>
        </Space>

        <Space>
          <span>弹性模量:</span>
          <InputNumber
            value={material.young_modulus / 1e9}
            onChange={v => onMaterialChange({ ...material, young_modulus: v * 1e9 })}
            min={1}
            max={1000}
            step={1}
            style={{ width: 120 }}
          />
          <Text type="secondary">GPa</Text>
        </Space>

        <Space>
          <span>泊松比:</span>
          <InputNumber
            value={material.poisson_ratio}
            onChange={v => onMaterialChange({ ...material, poisson_ratio: v })}
            min={0}
            max={0.5}
            step={0.01}
            precision={2}
            style={{ width: 120 }}
          />
        </Space>

        <Space>
          <span>密度:</span>
          <InputNumber
            value={material.density}
            onChange={v => onMaterialChange({ ...material, density: v })}
            min={100}
            max={20000}
            step={10}
            style={{ width: 120 }}
          />
          <Text type="secondary">kg/m³</Text>
        </Space>
      </Space>

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginBottom: 12 }}>网格设置</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
        网格尺寸越小，计算精度越高，但耗时更长
      </Text>

      <Space direction="vertical" style={{ width: '100%' }}>
        <span>网格尺寸: {meshSize.toFixed(3)}</span>
        <Slider
          value={meshSize}
          onChange={onMeshSizeChange}
          min={0.05}
          max={0.2}
          step={0.01}
          marks={{
            0.05: '精细',
            0.1: '中等',
            0.2: '粗糙'
          }}
        />
      </Space>

      <Divider style={{ margin: '16px 0' }} />

      <Title level={5} style={{ marginBottom: 12 }}>材料参数摘要</Title>
      <div style={{ fontSize: 12, color: '#666', lineHeight: 2 }}>
        <div>弹性模量 E = {(material.young_modulus / 1e9).toFixed(1)} GPa</div>
        <div>泊松比 ν = {material.poisson_ratio.toFixed(2)}</div>
        <div>密度 ρ = {material.density.toFixed(0)} kg/m³</div>
        <div>剪切模量 G = {(material.young_modulus / (2 * (1 + material.poisson_ratio)) / 1e9).toFixed(1)} GPa</div>
      </div>
    </div>
  );
}

export default MaterialProperties;
