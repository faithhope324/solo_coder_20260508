import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  DatePicker,
  Table,
  Statistic,
  Row,
  Col,
  Spin,
  Alert,
  Space,
  message,
  Tag
} from 'antd';
import { DownloadOutlined, FileTextOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getMonthlyReport, exportMonthlyReport } from '../services/api';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(dayjs());

  const fetchReport = async (month) => {
    try {
      setLoading(true);
      const year = month.year();
      const monthNum = month.month() + 1;
      const data = await getMonthlyReport(year, monthNum);
      setReport(data);
      setError(null);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setReport(null);
        setError('该月份没有数据');
      } else {
        setError('数据加载失败，请检查后端服务是否正常启动');
        console.error('加载数据失败:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [selectedMonth]);

  const handleMonthChange = (date) => {
    if (date) {
      setSelectedMonth(date);
    }
  };

  const handleExport = async () => {
    try {
      const year = selectedMonth.year();
      const monthNum = selectedMonth.month() + 1;
      const response = await exportMonthlyReport(year, monthNum);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `云成本月度报告-${year}-${String(monthNum).padStart(2, '0')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success('报告导出成功');
    } catch (err) {
      message.error('导出失败，请重试');
      console.error('导出失败:', err);
    }
  };

  const serviceColumns = [
    {
      title: '服务类型',
      dataIndex: 'service',
      key: 'service',
      render: (text) => (
        <Tag color={text === 'ECS' ? 'blue' : text === 'RDS' ? 'orange' : 'green'}>
          {text}
        </Tag>
      )
    },
    {
      title: '费用(元)',
      dataIndex: 'cost',
      key: 'cost',
      render: (text) => `¥${text}`,
      sorter: (a, b) => a.cost - b.cost,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (text) => `${text}%`,
    }
  ];

  const envColumns = [
    {
      title: '环境',
      dataIndex: 'environment',
      key: 'environment',
    },
    {
      title: '费用(元)',
      dataIndex: 'cost',
      key: 'cost',
      render: (text) => `¥${text}`,
      sorter: (a, b) => a.cost - b.cost,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (text) => `${text}%`,
    }
  ];

  const deptColumns = [
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
    },
    {
      title: '费用(元)',
      dataIndex: 'cost',
      key: 'cost',
      render: (text) => `¥${text}`,
      sorter: (a, b) => a.cost - b.cost,
    },
    {
      title: '占比',
      dataIndex: 'percentage',
      key: 'percentage',
      render: (text) => `${text}%`,
    }
  ];

  const dailyColumns = [
    {
      title: '日期',
      dataIndex: 'date',
      key: 'date',
    },
    {
      title: '费用(元)',
      dataIndex: 'cost',
      key: 'cost',
      render: (text) => `¥${text}`,
      sorter: (a, b) => a.cost - b.cost,
    }
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <DatePicker
            picker="month"
            value={selectedMonth}
            onChange={handleMonthChange}
            format="YYYY年MM月"
          />
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            disabled={!report}
          >
            导出CSV报告
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert message="提示" description={error} type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

      {report && (
        <>
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            <Col xs={24}>
              <Card>
                <Statistic
                  title={`${report.month} 月度总花费`}
                  value={report.totalCost}
                  prefix={<FileTextOutlined />}
                  suffix="元"
                  valueStyle={{ color: '#1890ff', fontSize: 32 }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
              <Card title="服务类型分布" size="small">
                <Table
                  dataSource={report.serviceBreakdown}
                  columns={serviceColumns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="环境分布" size="small">
                <Table
                  dataSource={report.environmentBreakdown}
                  columns={envColumns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={8}>
              <Card title="部门分布" size="small">
                <Table
                  dataSource={report.departmentBreakdown}
                  columns={deptColumns}
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          <Card title="每日花费明细" size="small" style={{ marginTop: 16 }}>
            <Table
              dataSource={report.dailyDetails}
              columns={dailyColumns}
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default Reports;
