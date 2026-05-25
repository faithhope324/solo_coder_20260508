import { useWebSocket } from '../hooks/useWebSocket';
import { Header } from '../components/Header';
import { StatsCard } from '../components/StatsCard';
import { TransactionList } from '../components/TransactionList';
import { DetectionChart } from '../components/DetectionChart';
import { FraudMap } from '../components/FraudMap';
import { useTransactionStore } from '../store/useTransactionStore';
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters';
import { CreditCard, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

export default function Home() {
  useWebSocket();
  const { stats } = useTransactionStore();

  const cards = [
    {
      title: '交易总数',
      value: formatNumber(stats.totalTransactions),
      icon: CreditCard,
      gradient: 'from-cyan-400 to-blue-500',
      subValue: '今日累计',
    },
    {
      title: '欺诈预警',
      value: formatNumber(stats.fraudCount),
      icon: AlertTriangle,
      gradient: 'from-red-400 to-orange-500',
      subValue: '今日检测',
    },
    {
      title: '检测率',
      value: formatPercentage(stats.detectionRate),
      icon: TrendingDown,
      gradient: 'from-amber-400 to-yellow-500',
      subValue: '欺诈 / 总交易',
    },
    {
      title: '欺诈金额',
      value: formatCurrency(stats.totalFraudAmount),
      icon: DollarSign,
      gradient: 'from-red-500 to-rose-600',
      subValue: '今日损失总额',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {cards.map((card, index) => (
              <StatsCard key={index} {...card} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <TransactionList />
            </div>
            <div className="lg:col-span-1">
              <DetectionChart />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <FraudMap />
          </div>
        </main>

        <footer className="px-6 py-4 border-t border-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p className="font-mono">
              隔离森林模型 • 阈值 0.6 • 100 棵决策树
            </p>
            <p className="font-mono">
              © 2026 欺诈检测系统 v1.0
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
