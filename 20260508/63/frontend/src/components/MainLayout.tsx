import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Dropdown, Badge, Typography } from 'antd';
import {
  DashboardOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  CloudSyncOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
} from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { api, TaskStatsSummary } from '../api';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [taskStats, setTaskStats] = useState<TaskStatsSummary | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await api.getTaskStatsSummary();
        setTaskStats(stats);
      } catch (error) {
        console.error('Failed to fetch task stats');
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  const selectedKey = location.pathname.split('/')[1] || 'overview';

  const menuItems = [
    {
      key: 'overview',
      icon: <DashboardOutlined />,
      label: 'CDN 概览',
      onClick: () => navigate('/overview'),
    },
    {
      key: 'domains',
      icon: <GlobalOutlined />,
      label: '域名管理',
      onClick: () => navigate('/domains'),
    },
    {
      key: 'preheat',
      icon: <ThunderboltOutlined />,
      label: (
        <Badge count={taskStats?.pending || 0} size="small" offset={[10, 0]}>
          预热管理
        </Badge>
      ),
      onClick: () => navigate('/preheat'),
    },
    {
      key: 'refresh',
      icon: <CloudSyncOutlined />,
      label: '刷新管理',
      onClick: () => navigate('/refresh'),
    },
    {
      key: 'tasks',
      icon: <BellOutlined />,
      label: (
        <Badge count={taskStats?.processing || 0} size="small" offset={[10, 0]}>
          任务列表
        </Badge>
      ),
      onClick: () => navigate('/tasks'),
    },
  ];

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: `${user?.username} (${user?.email})`,
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={240}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '0 16px',
          background: 'rgba(255, 255, 255, 0.05)',
        }}>
          {collapsed ? (
            <CloudSyncOutlined style={{ fontSize: 24, color: '#fff' }} />
          ) : (
            <Title level={5} style={{ color: '#fff', margin: 0 }}>
              CDN 管理系统
            </Title>
          )}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          style={{ marginTop: 16 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div></div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Badge count={taskStats?.processing || 0} size="small">
              <BellOutlined style={{ fontSize: 20, cursor: 'pointer', color: '#666' }} />
            </Badge>

            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 8 }}>
                <Avatar size="small" icon={<UserOutlined />} style={{ background: '#1890ff' }} />
                <span style={{ color: '#333' }}>{user?.username}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        <Content style={{
          margin: '24px',
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          minHeight: 'calc(100vh - 64px - 48px)',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
