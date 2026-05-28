import React, { useMemo } from 'react';
import { Typography, Spin, Statistic, Row, Col, Tag, Space } from 'antd';
import { ThunderboltOutlined, SafetyOutlined, ExperimentOutlined } from '@ant-design/icons';
import Plot from 'react-plotly.js';

const { Title, Text } = Typography;

function ResultVisualization({ shapes, result, isSimulating }) {
  const plotData = useMemo(() => {
    if (!result || !result.nodes || !result.elements) return null;

    const nodes = result.nodes;
    const elements = result.elements;
    const stress = result.stress || [];

    const x = nodes.map(n => n[0]);
    const y = nodes.map(n => n[1]);

    const maxStress = Math.max(...stress);
    const minStress = Math.min(...stress);

    const colorscale = [
      [0, '#0000ff'],
      [0.25, '#00ffff'],
      [0.5, '#00ff00'],
      [0.75, '#ffff00'],
      [1, '#ff0000']
    ];

    const meshData = {
      type: 'mesh3d',
      x: x,
      y: y,
      z: new Array(nodes.length).fill(0),
      i: elements.map(e => e[0]),
      j: elements.map(e => e[1]),
      k: elements.map(e => e[2]),
      intensity: stress,
      colorscale: colorscale,
      showscale: true,
      colorbar: {
        title: 'Von Mises 应力 (Pa)',
        x: 1.02,
        len: 0.8
      },
      opacity: 1
    };

    const wireframeData = {
      type: 'scatter3d',
      mode: 'lines',
      x: [],
      y: [],
      z: [],
      line: {
        color: 'rgba(0, 0, 0, 0.2)',
        width: 1
      },
      hoverinfo: 'skip'
    };

    elements.forEach(elem => {
      for (let i = 0; i < 3; i++) {
        const n1 = elem[i];
        const n2 = elem[(i + 1) % 3];
        wireframeData.x.push(nodes[n1][0], nodes[n2][0], null);
        wireframeData.y.push(nodes[n1][1], nodes[n2][1], null);
        wireframeData.z.push(0, 0, null);
      }
    });

    return {
      data: [meshData, wireframeData],
      layout: {
        autosize: true,
        margin: { l: 0, r: 80, t: 40, b: 40 },
        scene: {
          xaxis: { title: 'X (m)', range: [-0.1, 1.1] },
          yaxis: { title: 'Y (m)', range: [1.1, -0.1], autorange: 'reversed' },
          zaxis: { title: '', visible: false, range: [-0.1, 0.1] },
          aspectmode: 'manual',
          aspectratio: { x: 1, y: 1, z: 0.1 },
          camera: {
            eye: { x: 0, y: 0, z: 2.5 },
            up: { x: 0, y: -1, z: 0 }
          }
        },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: 'rgba(0,0,0,0)'
      },
      maxStress,
      minStress,
      avgStress: stress.reduce((a, b) => a + b, 0) / stress.length
    };
  }, [result]);

  const previewData = useMemo(() => {
    if (!shapes || shapes.length === 0) return null;

    const data = shapes.map((shape, index) => {
      if (shape.type === 'rectangle') {
        const x0 = shape.x;
        const y0 = shape.y;
        const x1 = shape.x + shape.width;
        const y1 = shape.y + shape.height;
        return {
          type: 'scatter',
          mode: 'lines',
          x: [x0, x1, x1, x0, x0],
          y: [y0, y0, y1, y1, y0],
          fill: 'toself',
          fillcolor: 'rgba(24, 144, 255, 0.3)',
          line: { color: '#1890ff', width: 2 },
          name: `矩形 ${index + 1}`
        };
      } else if (shape.type === 'circle') {
        const cx = shape.center_x || shape.x;
        const cy = shape.center_y || shape.y;
        const r = shape.radius;
        const theta = Array.from({ length: 64 }, (_, i) => (i / 63) * 2 * Math.PI);
        return {
          type: 'scatter',
          mode: 'lines',
          x: theta.map(t => cx + r * Math.cos(t)),
          y: theta.map(t => cy + r * Math.sin(t)),
          fill: 'toself',
          fillcolor: 'rgba(82, 196, 26, 0.3)',
          line: { color: '#52c41a', width: 2 },
          name: `圆形 ${index + 1}`
        };
      }
      return null;
    }).filter(Boolean);

    return {
      data,
      layout: {
        autosize: true,
        margin: { l: 40, r: 20, t: 20, b: 40 },
        xaxis: { title: 'X (m)', range: [-0.1, 1.1], scaleanchor: 'y', scaleratio: 1 },
        yaxis: { title: 'Y (m)', range: [1.1, -0.1], autorange: 'reversed' },
        showlegend: true,
        legend: { x: 1, y: 1 },
        plot_bgcolor: '#fafafa',
        paper_bgcolor: 'rgba(0,0,0,0)'
      }
    };
  }, [shapes]);

  if (isSimulating) {
    return (
      <div className="visualization-container">
        <div className="visualization-header">
          <Title level={4}>仿真计算中...</Title>
        </div>
        <div className="visualization-content">
          <div className="empty-state">
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>正在进行有限元计算，请稍候...</Text>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (result && result.status === 'completed' && plotData) {
    return (
      <div className="visualization-container">
        <div className="visualization-header">
          <Space align="center">
            <Title level={4} style={{ margin: 0 }}>应力分布云图</Title>
            <Tag color="green" icon={<SafetyOutlined />}>计算完成</Tag>
          </Space>
        </div>
        
        <Row gutter={16} style={{ padding: '0 16px 16px' }}>
          <Col span={8}>
            <Statistic
              title="最大应力"
              value={plotData.maxStress / 1e6}
              precision={2}
              suffix="MPa"
              valueStyle={{ color: '#cf1322' }}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="最小应力"
              value={plotData.minStress / 1e6}
              precision={2}
              suffix="MPa"
              valueStyle={{ color: '#3f8600' }}
              prefix={<SafetyOutlined />}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均应力"
              value={plotData.avgStress / 1e6}
              precision={2}
              suffix="MPa"
              prefix={<ExperimentOutlined />}
            />
          </Col>
        </Row>

        <div style={{ flex: 1, minHeight: 0, padding: '0 16px 16px' }}>
          <Plot
            data={plotData.data}
            layout={plotData.layout}
            config={{
              responsive: true,
              displayModeBar: true,
              displaylogo: false
            }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>

        <div style={{ padding: '0 16px 16px', fontSize: 12, color: '#666' }}>
          <Row gutter={16}>
            <Col span={8}>节点数: {result.nodes?.length || 0}</Col>
            <Col span={8}>单元数: {result.elements?.length || 0}</Col>
            <Col span={8}>自由度: {result.nodes?.length * 2 || 0}</Col>
          </Row>
        </div>
      </div>
    );
  }

  if (result && result.status === 'failed') {
    return (
      <div className="visualization-container">
        <div className="visualization-header">
          <Title level={4} type="danger">仿真失败</Title>
        </div>
        <div className="visualization-content">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <Text type="danger">{result.error || '计算过程中发生错误'}</Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="visualization-container">
      <div className="visualization-header">
        <Title level={4}>几何预览</Title>
      </div>
      <div className="visualization-content" style={{ padding: 16 }}>
        {previewData ? (
          <Plot
            data={previewData.data}
            layout={previewData.layout}
            config={{
              responsive: true,
              displayModeBar: true,
              displaylogo: false
            }}
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📐</div>
            <Text type="secondary">请在左侧绘制几何形状</Text>
            <div style={{ marginTop: 8, fontSize: 12 }}>
              支持绘制矩形和圆形，设置边界条件后即可开始仿真
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResultVisualization;
