import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import TopologyPage from './pages/TopologyPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import RulesPage from './pages/RulesPage.jsx';

function App() {
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">🔍 分布式追踪系统</div>
        <nav className="sidebar-nav">
          <NavLink to="/" end>
            📊 服务拓扑
          </NavLink>
          <NavLink to="/alerts">
            ⚠️ 告警记录
          </NavLink>
          <NavLink to="/rules">
            ⚙️ 告警规则
          </NavLink>
        </nav>
      </aside>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<TopologyPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/rules" element={<RulesPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
