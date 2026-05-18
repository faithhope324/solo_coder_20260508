import { Server, Activity, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useNodeStore } from '../../store/nodeStore';
import { STATUS_COLORS } from '../../types';

export const StatusBar = () => {
  const { nodes } = useNodeStore();

  const counts = {
    total: nodes.length,
    healthy: nodes.filter(n => n.status === 'healthy').length,
    warning: nodes.filter(n => n.status === 'warning').length,
    critical: nodes.filter(n => n.status === 'critical').length,
  };

  const healthScore = counts.total > 0
    ? Math.round((counts.healthy / counts.total) * 100)
    : 0;

  const StatCard = ({
    icon: Icon, label, value, color, subtitle }: {
      icon: any;
      label: string;
      value: number;
      color: string;
      subtitle?: string;
    }) => (
      <div className="flex items-center gap-3 px-4 py-2 bg-dark-800/80 rounded-xl border border-dark-700/50">
        <div
          className="p-2 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <div className="text-xs text-gray-400">{label}</div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-mono font-semibold" style={{ color }}>
              {value}
            </span>
            {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
          </div>
        </div>
      </div>
    );

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <StatCard
        icon={Activity}
        label="总体健康度"
        value={healthScore}
        color={healthScore >= 80 ? STATUS_COLORS.healthy : healthScore >= 50 ? STATUS_COLORS.warning : STATUS_COLORS.critical}
        subtitle="%"
      />
      <StatCard
        icon={Server}
        label="总节点"
        value={counts.total}
        color="#60a5fa"
        subtitle="个"
      />
      <StatCard
        icon={CheckCircle}
        label="正常"
        value={counts.healthy}
        color={STATUS_COLORS.healthy}
        subtitle="个"
      />
      <StatCard
        icon={AlertTriangle}
        label="警告"
        value={counts.warning}
        color={STATUS_COLORS.warning}
        subtitle="个"
      />
      <StatCard
        icon={XCircle}
        label="异常"
        value={counts.critical}
        color={STATUS_COLORS.critical}
        subtitle="个"
      />
    </div>
  );
};
