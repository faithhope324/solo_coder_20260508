import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Select,
  Typography,
  Tag,
  Spin,
  Space,
  Alert,
} from 'antd';
import {
  ThunderboltOutlined,
  GlobalOutlined,
  RiseOutlined,
  CloudServerOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { api, Domain, CdnOverview, HourlyStats } from '../api';

const { Title } = Typography;

export const OverviewPage: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null);
  const [overview, setOverview] = useState<CdnOverview | null>(null);
  const [stats, setStats] = useState<HourlyStats[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        const data = await api.getDomains();
        setDomains(data);
        if (data.length > 0 && !selectedDomain) {
          setSelectedDomain(data[0].id);
        }
      } catch (error) {
        console.error('Failed to fetch domains');
      }
    };

    fetchDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain === null) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [overviewData, statsData] = await Promise.all([
          api.getCdnOverview(selectedDomain),
          api.getCdnStats(selectedDomain, 24),
        ]);
        setOverview(overviewData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [selectedDomain]);

  const hitRateOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>缓存命中率: {c}%',
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: stats.map((s) => s.time),
    },
    yAxis: {
      type: 'value',
      max: 100,
      min: 60,
      axisLabel: { formatter: '{value}%' },
    },
    series: [
      {
        name: '缓存命中率',
        type: 'line',
        smooth: true,
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(82, 196, 26, 0.3)' },
              { offset: 1, color: 'rgba(82, 196, 26, 0.05)' },
            ],
          },
        },
        lineStyle: { color: '#52c41a', width: 3 },
        itemStyle: { color: '#52c41a' },
        data: stats.map((s) => s.hitRate),
      },
    ],
  };

  const bandwidthOption = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>带宽用量: {c} Mbps',
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: stats.map((s) => s.time),
    },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: '{value} Mbps' },
    },
    series: [
      {
        name: '带宽用量',
        type: 'bar',
        barWidth: '60%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: '#1890ff' },
              { offset: 1, color: '#69c0ff' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
        data: stats.map((s) => s.bandwidth),
      },
    ],
  };

  if (domains.length === 0) {
    return (
      <Alert
        message="暂无域名"
        description="请先添加域名才能查看 CDN 统计数据"
        type="info"
        showIcon
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>CDN 概览</Title>
        <Select
          style={{ width: 280 }}
          value={selectedDomain}
          onChange={setSelectedDomain}
          placeholder="选择域名"
          size="large"
        >
          {domains.map((d) => (
            <Select.Option key={d.id} value={d.id}>
              <Space>
                <GlobalOutlined />
                {d.domain}
              </Space>
            </Select.Option>
          ))}
        </Select>
      </div>

      <Spin spinning={loading}>
        {overview && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="缓存命中率"
                    value={overview.currentHitRate}
                    precision={2}
                    suffix="%"
                    prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="实时带宽"
                    value={overview.currentBandwidth}
                    precision={2}
                    suffix="Mbps"
                    prefix={<ThunderboltOutlined style={{ color: '#1890ff' }} />}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="今日请求数"
                    value={overview.todayRequestCount}
                    prefix={<CloudServerOutlined style={{ color: '#722ed1' }} />}
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="今日流量"
                    value={overview.todayFlow}
                    suffix="GB"
                    precision={2}
                    prefix={<GlobalOutlined style={{ color: '#fa8c16' }} />}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <RiseOutlined style={{ color: '#52c41a' }} />
                      缓存命中率趋势（近24小时）
                      <Tag color="green">实时更新</Tag>
                    </Space>
                  }
                  extra={<Tag color={overview.activeStatus === 'online' ? 'green' : 'red'}>
                    {overview.activeStatus === 'online' ? '服务正常' : '服务异常'}
                  </Tag>}
                >
                  <ReactECharts option={hitRateOption} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
                </Card>
              </Col>
              <Col span={24}>
                <Card
                  title={
                    <Space>
                      <ThunderboltOutlined style={{ color: '#1890ff' }} />
                      带宽用量（近24小时）
                    </Space>
                  }
                >
                  <ReactECharts option={bandwidthOption} style={{ height: 320 }} notMerge={true} lazyUpdate={true} />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Spin>
    </div>
  );
};
