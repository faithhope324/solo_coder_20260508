import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Input,
  Button,
  Space,
  Typography,
  Table,
  Tag,
  Progress,
  Alert,
  message,
  Modal,
} from 'antd';
import { ThunderboltOutlined, PlusOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { api, Domain, Task } from '../api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'default', text: '等待中' },
  processing: { color: 'processing', text: '处理中' },
  success: { color: 'success', text: '成功' },
  failed: { color: 'error', text: '失败' },
};

export const PreheatPage: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<number | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [domainData, taskData] = await Promise.all([
        api.getDomains(),
        api.getTasks({ type: 'preheat', pageSize: 20 }),
      ]);
      setDomains(domainData);
      setTasks(taskData.list);
      if (domainData.length > 0 && !selectedDomain) {
        setSelectedDomain(domainData[0].id);
      }
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (values: { urls: string }) => {
    if (!selectedDomain) {
      message.error('请选择域名');
      return;
    }

    const urls = values.urls
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u);

    if (urls.length === 0) {
      message.error('请输入至少一个 URL');
      return;
    }

    if (urls.length > 1000) {
      message.error('单次最多提交 1000 个 URL');
      return;
    }

    setSubmitting(true);
    try {
      await api.submitPreheat(selectedDomain, urls);
      message.success(`成功提交 ${urls.length} 个 URL 进行预热`);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePreview = () => {
    const urlsValue = form.getFieldValue('urls') || '';
    const urls = urlsValue
      .split('\n')
      .map((u: string) => u.trim())
      .filter((u: string) => u);
    setPreviewUrls(urls);
    setPreviewVisible(true);
  };

  const generateSampleUrls = () => {
    if (!selectedDomain) {
      message.error('请先选择域名');
      return;
    }
    const domain = domains.find((d) => d.id === selectedDomain);
    if (!domain) return;

    const samples = [
      `https://${domain.domain}/index.html`,
      `https://${domain.domain}/static/css/main.css`,
      `https://${domain.domain}/static/js/app.js`,
      `https://${domain.domain}/images/logo.png`,
      `https://${domain.domain}/api/v1/config`,
    ];
    form.setFieldsValue({ urls: samples.join('\n') });
  };

  const columns = [
    {
      title: '任务ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '域名',
      dataIndex: ['domain', 'domain'],
      key: 'domain',
      width: 180,
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
      render: (status: string) => {
        const info = statusMap[status];
        return <Tag color={info.color}>{info.text}</Tag>;
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
      width: 80,
      render: (_: any, record: Task) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setPreviewUrls(record.urls);
            setPreviewVisible(true);
          }}
        >
          查看URL
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
        <ThunderboltOutlined style={{ fontSize: 28, color: '#fa8c16', marginRight: 12 }} />
        <Title level={3} style={{ margin: 0 }}>预热管理</Title>
      </div>

      {domains.length === 0 ? (
        <Alert
          message="暂无域名"
          description="请先添加域名才能进行预热操作"
          type="info"
          showIcon
        />
      ) : (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Card title="提交预热任务">
            <Form form={form} onFinish={handleSubmit} layout="vertical">
              <Form.Item
                label="选择域名"
                rules={[{ required: true, message: '请选择域名' }]}
              >
                <Select
                  value={selectedDomain}
                  onChange={setSelectedDomain}
                  placeholder="请选择要预热的域名"
                >
                  {domains.map((d) => (
                    <Select.Option key={d.id} value={d.id}>
                      {d.domain}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item
                name="urls"
                label={
                  <Space>
                    URL 列表
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      每行一个 URL，支持 http:// 或 https:// 协议
                    </Text>
                  </Space>
                }
                rules={[{ required: true, message: '请输入 URL 列表' }]}
              >
                <TextArea
                  rows={8}
                  placeholder="https://example.com/index.html&#10;https://example.com/static/js/app.js&#10;https://example.com/images/logo.png"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Space>
                  <Button type="primary" htmlType="submit" loading={submitting} icon={<PlusOutlined />}>
                    提交预热
                  </Button>
                  <Button onClick={handlePreview}>预览 URL</Button>
                  <Button onClick={generateSampleUrls}>生成示例</Button>
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    <InfoCircleOutlined /> 单次最多提交 1000 个 URL，预热任务提交后将进入队列处理
                  </Text>
                </div>
              </Form.Item>
            </Form>
          </Card>

          <Card title="预热任务列表">
            <Table
              columns={columns}
              dataSource={tasks}
              rowKey="id"
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </Space>
      )}

      <Modal
        title="URL 列表预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {previewUrls.length === 0 ? (
            <Text type="secondary">暂无 URL</Text>
          ) : (
            previewUrls.map((url, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                  fontFamily: 'monospace',
                  fontSize: 12,
                }}
              >
                {index + 1}. {url}
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
};
