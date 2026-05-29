import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Server, User } from 'lucide-react';
import { Dashboard } from './pages/Dashboard';
import { AuditLogs } from './pages/AuditLogs';
import { cn } from './lib/utils';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800">多租户资源配额管理</h1>
                  <p className="text-xs text-slate-500 hidden sm:block">Tenant Resource Quota Management</p>
                </div>
              </div>

              <nav className="flex items-center gap-1">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    )
                  }
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">资源概览</span>
                </NavLink>
                <NavLink
                  to="/audit"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                    )
                  }
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">审计日志</span>
                </NavLink>
              </nav>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 hidden sm:inline">admin</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/audit" element={<AuditLogs />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 py-4 mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-slate-500">
            © 2026 多租户资源配额管理系统
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
