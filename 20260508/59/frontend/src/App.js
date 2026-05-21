import React, { useState, useEffect } from 'react';
import { Layout, Row, Col, Card, Button, Statistic, Spin, message, Tabs } from 'antd';
import { PlayCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import axios from 'axios';
import PredictionChart from './components/PredictionChart';
import SignalControlPanel from './components/SignalControlPanel';
import ComparisonPanel from './components/ComparisonPanel';
import HistoricalChart from './components/HistoricalChart';

const { Header, Content } = Layout;

function App() {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [predictionData, setPredictionData] = useState(null);
  const [historicalData, setHistoricalData] = useState(null);
  const [signalPhases, setSignalPhases] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [baselineTimes, setBaselineTimes] = useState({});
  const [optimizedTimes, setOptimizedTimes] = useState({});

  useEffect(() => {
    checkHealth();
    fetchSignalPhases();
  }, []);

  const checkHealth = async () => {
    try {
      const response = await axios.get('/api/health');
      setModelReady(response.data.model_trained);
    } catch (error) {
      console.error('健康检查失败:', error);
    }
  };

  const fetchSignalPhases = async () => {
    try {
      const response = await axios.get('/api/signal-phases');
      if (response.data.success) {
        setSignalPhases(response.data.phases);
        const times = {};
        response.data.phases.forEach(phase => {
          times[phase.name] = phase.green_time;
        });
        setBaselineTimes({ ...times });
        setOptimizedTimes({ ...times });
      }
    } catch (error) {
      console.error('获取信号相位失败:', error);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      message.info('正在初始化系统并训练LSTM模型，这可能需要几分钟...');
      const response = await axios.post('/api/init');
      if (response.data.success) {
        message.success(`系统初始化完成！训练样本: ${response.data.training_samples}`);
        setModelReady(true);
        handlePredict();
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error('初始化失败: ' + error.message);
    } finally {
      setInitializing(false);
    }
  };

  const handlePredict = async () => {
    if (!modelReady) {
      message.warning('请先初始化系统');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get('/api/predict');
      if (response.data.success) {
        setPredictionData(response.data.prediction);
        setHistoricalData(response.data.historical);
        message.success('预测完成！');
      }
    } catch (error) {
      message.error('预测失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!modelReady) {
      message.warning('请先初始化系统');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/api/evaluate', {
        baseline: baselineTimes,
        optimized: optimizedTimes
      });
      if (response.data.success) {
        setComparisonData(response.data);
        message.success('信号配时方案评估完成！');
      }
    } catch (error) {
      message.error('评估失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizedTimesChange = (newTimes) => {
    setOptimizedTimes(newTimes);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <h1>🚦 交通流量预测与信号优化系统</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>
          基于LSTM的流量预测 · 交通仿真评估 · 智能信号配时优化
        </p>
      </Header>
      <Content className="app-content">
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col span={24}>
            <Card>
              <Row gutter={16} align="middle">
                <Col>
                  <Statistic
                    title="系统状态"
                    value={modelReady ? '已就绪' : '未初始化'}
                    valueStyle={{ color: modelReady ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
                <Col>
                  {!modelReady ? (
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      loading={initializing}
                      onClick={handleInitialize}
                    >
                      {initializing ? '初始化中...' : '初始化系统'}
                    </Button>
                  ) : (
                    <Button
                      type="primary"
                      size="large"
                      icon={<ReloadOutlined />}
                      loading={loading}
                      onClick={handlePredict}
                    >
                      获取最新预测
                    </Button>
                  )}
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        <Spin spinning={loading && !initializing}>
          <Tabs
            defaultActiveKey="prediction"
            items={[
              {
                key: 'prediction',
                label: '流量预测',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <PredictionChart data={predictionData} historical={historicalData} />
                    </Col>
                    <Col span={24}>
                      <HistoricalChart data={historicalData} />
                    </Col>
                  </Row>
                ),
              },
              {
                key: 'optimization',
                label: '信号优化',
                children: (
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <SignalControlPanel
                        phases={signalPhases}
                        baselineTimes={baselineTimes}
                        optimizedTimes={optimizedTimes}
                        onOptimizedChange={handleOptimizedTimesChange}
                        onEvaluate={handleEvaluate}
                        loading={loading}
                      />
                    </Col>
                    <Col span={24}>
                      <ComparisonPanel data={comparisonData} />
                    </Col>
                  </Row>
                ),
              },
            ]}
          />
        </Spin>
      </Content>
    </Layout>
  );
}

export default App;
