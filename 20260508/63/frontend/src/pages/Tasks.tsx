import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Tag,
  Progress,
  Space,
  Typography,
  Select,
  Row,
  Col,
  Statistic,
  Button,
  Modal,
  Tooltip,
  Empty,
} from 'antd';
import {
  BellOutlined,
  ThunderboltOutlined,
  CloudSyncOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { api, Task, TaskType, TaskStatus, TaskStatsSummary } from '../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const typeMap: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  preheat: {
    icon: <ThunderboltOutlined />,
    label: '预热',
    color: 'orange',
  },
  refresh: {
    icon: <CloudSyncOutlined />,
    label: '刷新',
    color: 'blue',
  },
};

const statusMap: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
  pending: {
    color: 'default',
    text: '等待中',
    icon: <ClockCircleOutlined style={{ color: '#bfbfbf' }} />,
  },
  processing: {
    color: 'processing',
    text: '处理中',
    icon: <SyncOutlined spin style={{ color: '#1890ff' }} />,
  },
  success: {
    color: 'success',
    text: '成功',
    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  },
  failed: {
    color: 'error',
    text: '失败',
    icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
  },
};

export const TasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [filterType, setFilterType] = useState<TaskType | undefined>();
  const [filterStatus, setFilterStatus] = useState<TaskStatus | undefined>();
  const [stats, setStats] = useState<TaskStatsSummary | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getTasks({
        page: pagination.page,
        pageSize: pagination.pageSize,
        type: filterType,
        status: filterStatus,
      });
      setTasks(data.list);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (error) {
      console.error('Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await api.getTaskStatsSummary();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStats();
    const interval = setInterval(() => {
      fetchTasks();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [pagination.page, pagination.pageSize, filterType, filterStatus]);

  const handleFilterChange = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const viewDetail = async (task: Task) => {
    try {
      const detail = await api.getTask(task.id);
      setSelectedTask(detail);
      setDetailVisible(true);
    } catch (error) {
      console.error('Failed to fetch task detail');
    }
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: TaskType) => {
        const info = typeMap[type];
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: '域名',
      dataIndex: ['domain', 'domain'],
      key: 'domain',
      width: 200,
    },
    {
      title: 'URL 数量',
      dataIndex: 'totalCount',
      key: 'totalCount',
      width: 100,
      render: (count: number) => `${count} 个`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: TaskStatus) => {
        const info = statusMap[status];
        return (
          <Space>
            {info.icon}
            <Tag color={info.color}>{info.text}</Tag>
          </Space>
        );
      },
    },
    {
      title: '进度',
      key: 'progress',
      minWidth: 200,
      render: (_: any, record: Task) => (
        <div>
          <Progress
            percent={record.progress}
            status={
              record.status === 'failed'
                ? 'exception'
                : record.status === 'success'
                ? 'success'
                : 'active'
            }
            size="small"
          />
          <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
            成功 {record.successCount} / 失败 {record.failCount} / 共 {record.totalCount}
          </div>
        </div>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '完成时间',
      dataIndex: 'completedAt',
      key: 'completedAt',
      width: 180,
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Task) => (
        <Button type="link" size="small" onClick={() => viewDetail(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <BellOutlined style={{ fontSize: 28, color: '#722ed1', marginRight: 12 }} />
        <Title level={3} style={{ margin: 0 }}>任务列表</Title>
      </div>

      {stats && (
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="今日任务"
                value={stats.today}
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="等待中"
                value={stats.pending}
                valueStyle={{ color: '#bfbfbf' }}
                prefix={<ClockCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.processing}
                valueStyle={{ color: '#1890ff' }}
                prefix={<SyncOutlined spin />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="已成功"
                value={stats.success}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <Card>
              <Statistic
                title="已失败"
                value={stats.failed}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      <Card
        title={
          <Space>
            <span>筛选</span>
            <Select
              placeholder="任务类型"
              style={{ width: 140 }}
              allowClear
              value={filterType}
              onChange={(v) => {
                setFilterType(v);
                handleFilterChange();
              }}
            >
              <Select.Option value="preheat">
                <Space>
                  <ThunderboltOutlined />
                  预热
                </Space>
              </Select.Option>
              <Select.Option value="refresh">
                <Space>
                  <CloudSyncOutlined />
                  刷新
                </Space>
              </Select.Option>
            </Select>
            <Select
              placeholder="任务状态"
              style={{ width: 140 }}
              allowClear
              value={filterStatus}
              onChange={(v) => {
                setFilterStatus(v);
                handleFilterChange();
              }}
            >
              <Select.Option value="pending">等待中</Select.Option>
              <Select.Option value="processing">处理中</Select.Option>
              <Select.Option value="success">成功</Select.Option>
              <Select.Option value="failed">失败</Select.Option>
            </Select>
          </Space>
        }
        extra={<Button onClick={() => { fetchTasks(); fetchStats(); }}>刷新</Button>}
      >
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          locale={{
            emptyText: <Empty description="暂无任务" />,
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, pageSize) => setPagination({ page, pageSize, total: pagination.total }),
          }}
        />
      </Card>

      <Modal
        title={
          <Space>
            {selectedTask && typeMap[selectedTask.type].icon}
            任务详情 #{selectedTask?.id}
          </Space>
        }
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>
            关闭
          </Button>,
        ]}
        width={720}
      >
        {selectedTask && (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">任务类型</Text>
                <div>
                  <Tag color={typeMap[selectedTask.type].color}>
                    {typeMap[selectedTask.type].icon} {typeMap[selectedTask.type].label}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Text type="secondary">任务状态</Text>
                <div>
                  {statusMap[selectedTask.status].icon}{' '}
                  <Tag color={statusMap[selectedTask.status].color}>
                    {statusMap[selectedTask.status].text}
                  </Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">域名</Text>
                <div>{selectedTask.domain.domain}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">云厂商</Text>
                <div>{selectedTask.domain.provider}</div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Text type="secondary">执行进度</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    percent={selectedTask.progress}
                    status={
                      selectedTask.status === 'failed'
                        ? 'exception'
                        : selectedTask.status === 'success'
                        ? 'success'
                        : 'active'
                    }
                  />
                  <div style={{ marginTop: 8 }}>
                    总 URL 数: {selectedTask.totalCount} |
                    成功: {selectedTask.successCount} |
                    失败: {selectedTask.failCount}
                  </div>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text type="secondary">提交时间</Text>
                <div>{dayjs(selectedTask.createdAt).format('YYYY-MM-DD HH:mm:ss')}</div>
              </Col>
              <Col span={12}>
                <Text type="secondary">完成时间</Text>
                <div>
                  {selectedTask.completedAt
                    ? dayjs(selectedTask.completedAt).format('YYYY-MM-DD HH:mm:ss')
                    : '-'}
                </div>
              </Col>
            </Row>

            {selectedTask.errorMessage && (
              <div>
                <Text type="danger">错误信息</Text>
                <div style={{ background: '#fff1f0', padding: 12, borderRadius: 4, marginTop: 4 }}>
                  {selectedTask.errorMessage}
                </div>
              </div>
            )}

            <div>
              <Text type="secondary">URL 列表 ({selectedTask.urls.length} 个)</Text>
              <div
                style={{
                  marginTop: 8,
                  maxHeight: 300,
                  overflowY: 'auto',
                  background: '#fafafa',
                  borderRadius: 4,
                }}
              >
                {selectedTask.urls.map((url, index) => (
                  <Tooltip key={index} title={url}>
                    <div
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f0f0f0',
                        fontFamily: 'monospace',
                        fontSize: 12,
                      }}
                    >
                      {index + 1}. {url}
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
};
