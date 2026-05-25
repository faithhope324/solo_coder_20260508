import { useTransactionStore } from '../store/useTransactionStore';
import { formatCurrency, formatTime } from '../utils/formatters';
import { AlertTriangle, CheckCircle, MapPin, CreditCard } from 'lucide-react';

export function TransactionList() {
  const { transactions } = useTransactionStore();

  return (
    <div className="relative bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-200">最近交易</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">最近 20 笔交易</span>
        </div>
      </div>

      <div className="overflow-auto max-h-96">
        <table className="w-full">
          <thead className="sticky top-0 bg-slate-900/98 backdrop-blur-md z-10 shadow-md">
            <tr className="text-xs text-slate-400 tracking-wider">
              <th className="px-4 py-3 text-left font-medium">时间</th>
              <th className="px-4 py-3 text-left font-medium">金额</th>
              <th className="px-4 py-3 text-left font-medium">商户</th>
              <th className="px-4 py-3 text-left font-medium">位置</th>
              <th className="px-4 py-3 text-left font-medium">风险评分</th>
              <th className="px-4 py-3 text-center font-medium">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-2">
                  <CreditCard className="w-8 h-8 text-slate-600" />
                  <p className="text-sm">等待交易数据...</p>
                </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx, index) => (
                <tr
                  key={tx.id}
                  className={`
                  ${
                    tx.isFraud
                      ? 'bg-red-500/10 animate-pulse border-l-4 border-l-red-500'
                      : index % 2 === 0
                      ? 'bg-slate-800/30'
                      : ''
                  }
                  transition-all duration-300 hover:bg-slate-800/50
                `}
                  style={{
                    animation: `slideIn 0.3s ease-out ${index * 0.05}s both`,
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono text-slate-300">
                      {formatTime(tx.timestamp)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-sm font-mono font-semibold ${
                      tx.isFraud ? 'text-red-400' : 'text-cyan-400'
                    }`}
                    >
                      {formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-200">{tx.merchant}</span>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {tx.transactionType} • {tx.cardType}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {tx.location}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            tx.fraudScore > 0.6
                              ? 'bg-gradient-to-r from-yellow-500 to-red-500'
                              : 'bg-gradient-to-r from-green-500 to-cyan-500'
                          }`}
                          style={{ width: `${tx.fraudScore * 100}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono ${
                          tx.fraudScore > 0.6 ? 'text-red-400' : 'text-slate-400'
                        }`}
                      >
                        {tx.fraudScore.toFixed(3)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.isFraud ? (
                      <div className="flex items-center justify-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-400 animate-bounce" />
                        <span className="text-xs font-semibold text-red-400 tracking-wider">
                          欺诈
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4 text-green-400" />
                        <span className="text-xs font-medium text-green-400">正常</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
