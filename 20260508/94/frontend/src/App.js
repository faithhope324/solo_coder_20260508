import React, { useState, useCallback } from 'react';
import { Layout, Tabs, Button, Space, message } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import GeometryCanvas from './components/GeometryCanvas';
import BoundaryConditions from './components/BoundaryConditions';
import MaterialProperties from './components/MaterialProperties';
import ResultVisualization from './components/ResultVisualization';
import { runSimulation, getSimulationStatus } from './api';
import './App.css';

const { Header, Sider, Content } = Layout;

function App() {
  const [shapes, setShapes] = useState([]);
  const [boundaryConditions, setBoundaryConditions] = useState([
    { type: 'fixed', location: 'left', value: 0.01, direction: 'x' },
    { type: 'force', location: 'right', value: 10000, direction: 'x' }
  ]);
  const [material, setMaterial] = useState({
    young_modulus: 210e9,
    poisson_ratio: 0.3,
    density: 7850
  });
  const [meshSize, setMeshSize] = useState(0.1);
  const [simulationResult, setSimulationResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState('geometry');

  const handleAddShape = useCallback((shape) => {
    setShapes(prev => [...prev, { ...shape, id: Date.now() }]);
  }, []);

  const handleRemoveShape = useCallback((id) => {
    setShapes(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleRunSimulation = async () => {
    if (shapes.length === 0) {
      message.error('请先绘制几何形状');
      return;
    }

    setIsSimulating(true);
    setSimulationResult(null);
    setActiveTab('results');

    try {
      const response = await runSimulation({
        shapes: shapes.map(({ id, ...rest }) => rest),
        boundary_conditions: boundaryConditions,
        material,
        mesh_size: meshSize
      });

      const taskId = response.data.task_id;
      message.info(`仿真任务已启动，任务ID: ${taskId.substring(0, 8)}...`);

      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await getSimulationStatus(taskId);
          const status = statusResponse.data;

          if (status.status === 'completed') {
            clearInterval(pollInterval);
            setSimulationResult(status);
            setIsSimulating(false);
            message.success('仿真计算完成！');
          } else if (status.status === 'failed') {
            clearInterval(pollInterval);
            setIsSimulating(false);
            message.error(`仿真失败: ${status.error || '未知错误'}`);
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(pollInterval);
        setIsSimulating(false);
      }, 120000);

    } catch (error) {
      setIsSimulating(false);
      message.error('启动仿真失败: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleReset = () => {
    setShapes([]);
    setSimulationResult(null);
    setActiveTab('geometry');
  };

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <div className="header-title">在线有限元模拟系统</div>
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRunSimulation}
            loading={isSimulating}
            disabled={shapes.length === 0}
          >
            {isSimulating ? '计算中...' : '开始仿真'}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            重置
          </Button>
        </Space>
      </Header>
      <Layout>
        <Sider width={320} className="app-sider">
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'geometry',
                label: '几何建模',
                children: (
                  <GeometryCanvas
                    shapes={shapes}
                    onAddShape={handleAddShape}
                    onRemoveShape={handleRemoveShape}
                  />
                )
              },
              {
                key: 'boundary',
                label: '边界条件',
                children: (
                  <BoundaryConditions
                    conditions={boundaryConditions}
                    onChange={setBoundaryConditions}
                  />
                )
              },
              {
                key: 'material',
                label: '材料属性',
                children: (
                  <MaterialProperties
                    material={material}
                    meshSize={meshSize}
                    onMaterialChange={setMaterial}
                    onMeshSizeChange={setMeshSize}
                  />
                )
              }
            ]}
          />
        </Sider>
        <Content className="app-content">
          <ResultVisualization
            shapes={shapes}
            result={simulationResult}
            isSimulating={isSimulating}
          />
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
