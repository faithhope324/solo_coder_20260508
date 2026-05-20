import React, { useState, useEffect } from 'react';
import { Row, Col, Spin, Alert } from 'antd';
import { DollarOutlined, ThunderboltOutlined, CloudServerOutlined, SaveOutlined } from '@ant-design/icons';
import StatCard from '../components/StatCard';
import CostTrendChart from '../components/CostTrendChart';
import ServicePieChart from '../components/ServicePieChart';
import TagBarChart from '../components/TagBarChart';
import {
  getSummary,
  getCostTrend,
  getServiceDistribution,
  getCostByEnvironment,
  getCostByDepartment
} from '../services/api';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [serviceData, setServiceData] = useState([]);
  const [envData, setEnvData] = useState([]);
  const [deptData, setDeptData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [summaryRes, trendRes, serviceRes, envRes, deptRes] = await Promise.all([
          getSummary(),
          getCostTrend(),
          getServiceDistribution(),
          getCostByEnvironment(),
          getCostByDepartment()
        ]);
        setSummary(summaryRes);
        setTrendData(trendRes);
        setServiceData(serviceRes);
        setEnvData(envRes);
        setDeptData(deptRes);
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
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="近30天总花费"
            value={summary?.totalCost || 0}
            prefix={<DollarOutlined />}
            suffix="元"
            color="#1890ff"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="日均花费"
            value={summary?.dailyAverage || 0}
            prefix={<ThunderboltOutlined />}
            suffix="元/天"
            color="#52c41a"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="云资源实例数"
            value={summary?.instanceCount || 0}
            prefix={<CloudServerOutlined />}
            suffix="个"
            color="#722ed1"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="可节省金额"
            value={summary?.totalMonthlySavings || 0}
            prefix={<SaveOutlined />}
            suffix="元/月"
            color="#faad14"
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <CostTrendChart data={trendData} />
          </div>
        </Col>
        <Col xs={24} lg={8}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, marginBottom: 16 }}>
            <ServicePieChart data={serviceData} />
          </div>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
            <TagBarChart title="按环境分布" data={envData} color="#1890ff" />
          </div>
        </Col>
        <Col xs={24} lg={12}>
          <div style={{ background: '#fff', padding: 16, borderRadius: 8 }}>
            <TagBarChart title="按部门分布" data={deptData} color="#722ed1" />
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
