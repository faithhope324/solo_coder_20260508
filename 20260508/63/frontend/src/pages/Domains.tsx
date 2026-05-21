import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Tag,
  message,
  Popconfirm,
  Typography,
  Card,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, GlobalOutlined } from '@ant-design/icons';
import { api, Domain } from '../api';
import dayjs from 'dayjs';

const { Title } = Typography;

const providerMap: Record<string, { label: string; color: string }> = {
  aliyun: { label: '阿里云', color: 'orange' },
  tencent: { label: '腾讯云', color: 'blue' },
  qiniu: { label: '七牛云', color: 'purple' },
  aws: { label: 'AWS', color: 'red' },
  cloudflare: { label: 'Cloudflare', color: 'cyan' },
};

export const DomainsPage: React.FC = () => {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [form] = Form.useForm();

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const data = await api.getDomains();
      setDomains(data);
    } catch (error) {
      message.error('获取域名列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAdd = () => {
    setEditingDomain(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (domain: Domain) => {
    setEditingDomain(domain);
    form.setFieldsValue({
      domain: domain.domain,
      provider: domain.provider,
      region: domain.region,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteDomain(id);
      message.success('删除成功');
      fetchDomains();
    } catch (error: any) {
      message.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleSubmit = async (values: { domain: string; provider: string; region: string }) => {
    try {
      if (editingDomain) {
        await api.updateDomain(editingDomain.id, values.provider, values.region);
        message.success('更新成功');
      } else {
        await api.addDomain(values.domain, values.provider, values.region);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchDomains();
    } catch (error: any) {
      message.error(error.response?.data?.message || '操作失败');
    }
  };

  const columns = [
    {
      title: '域名',
      dataIndex: 'domain',
      key: 'domain',
      render: (text: string) => (
        <Space>
          <GlobalOutlined />
          <a href={`https://${text}`} target="_blank" rel="noreferrer">
            {text}
          </a>
        </Space>
      ),
    },
    {
      title: '云厂商',
      dataIndex: 'provider',
      key: 'provider',
      width: 120,
      render: (provider: string) => {
        const info = providerMap[provider] || { label: provider, color: 'default' };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: 'CNAME',
      dataIndex: 'cname',
      key: 'cname',
      width: 280,
      render: (text: string) => <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>{text}</code>,
    },
    {
      title: '区域',
      dataIndex: 'region',
      key: 'region',
      width: 80,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? '已启用' : '已停用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: Domain) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除该域名吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>域名管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          添加域名
        </Button>
      </div>

      <Card>
        <Table
          columns={columns}
          dataSource={domains}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title={editingDomain ? '编辑域名' : '添加域名'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={480}
      >
        <Form form={form} onFinish={handleSubmit} layout="vertical">
          <Form.Item
            name="domain"
            label="域名"
            rules={[
              { required: true, message: '请输入域名' },
              { pattern: /^[a-zA-Z0-9][-a-zA-Z0-9]{0,62}(\.[a-zA-Z0-9][-a-zA-Z0-9]{0,62})+$/, message: '请输入有效的域名' },
            ]}
          >
            <Input placeholder="example.com" disabled={!!editingDomain} />
          </Form.Item>

          <Form.Item
            name="provider"
            label="云厂商"
            rules={[{ required: true, message: '请选择云厂商' }]}
          >
            <Select>
              <Select.Option value="aliyun">阿里云</Select.Option>
              <Select.Option value="tencent">腾讯云</Select.Option>
              <Select.Option value="qiniu">七牛云</Select.Option>
              <Select.Option value="aws">AWS</Select.Option>
              <Select.Option value="cloudflare">Cloudflare</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="region"
            label="区域"
            rules={[{ required: true, message: '请输入区域' }]}
          >
            <Input placeholder="CN" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                {editingDomain ? '更新' : '添加'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
