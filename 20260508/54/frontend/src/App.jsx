import React, { useState } from 'react';
import { Layout, Menu, theme } from 'antd';
import {
  DashboardOutlined,
  PieChartOutlined,
  BarChartOutlined,
  BulbOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import Savings from './pages/Savings';
import Reports from './pages/Reports';

const { Header, Content, Sider } = Layout;

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('1');
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: '成本概览',
    },
    {
      key: '2',
      icon: <BulbOutlined />,
      label: '节省建议',
    },
    {
      key: '3',
      icon: <FileTextOutlined />,
      label: '账单报告',
    },
  ];

  const renderContent = () => {
    switch (selectedKey) {
      case '1':
        return <Dashboard />;
      case '2':
        return <Savings />;
      case '3':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
        <div style={{
          height: 64,
          margin: 16,
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: collapsed ? 12 : 18,
          fontWeight: 'bold'
        }}>
          {collapsed ? '云' : '云成本分析'}
        </div>
        <Menu
          theme="dark"
          selectedKeys={[selectedKey]}
          mode="inline"
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
        />
      </Sider>
      <Layout>
        <Header style={{
          padding: '0 24px',
          background: colorBgContainer,
          display: 'flex',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: 20 }}>
            {menuItems.find(item => item.key === selectedKey)?.label}
          </h1>
        </Header>
        <Content style={{
          margin: '24px 16px',
          padding: 24,
          minHeight: 280,
          background: colorBgContainer,
          borderRadius: borderRadiusLG,
        }}>
          {renderContent()}
        </Content>
      </Layout>
    </Layout>
  );
}

export default App;
