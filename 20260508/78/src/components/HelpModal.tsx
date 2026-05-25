import { X, BookOpen, Calculator, Map, LineChart } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-slate-700 m-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/95">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            使用帮助
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-orange-400" />
              模型说明
            </h3>
            <div className="bg-slate-900/50 rounded-lg p-4 text-sm text-slate-300 space-y-2">
              <p>
                <strong className="text-cyan-400">高斯烟羽模型</strong> 是一种经典的大气扩散模型，
                用于模拟连续点源排放的污染物在大气中的扩散规律。
              </p>
              <p>
                模型假设污染物浓度在横风向和垂直方向上呈高斯分布，
                适用于平坦地形、定常气象条件下的连续排放源。
              </p>
              <div className="mt-3 p-3 bg-slate-800 rounded border border-slate-700 font-mono text-xs">
                <p className="text-slate-400 mb-2">地面浓度计算公式:</p>
                <p className="text-cyan-300">
                  C(x,y,0) = (Q/πuσyσz) × exp(-y²/2σy²) × exp(-H²/2σz²)
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Map className="w-4 h-4 text-emerald-400" />
              地图操作
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                <p className="text-cyan-400 font-medium mb-1">设置污染源位置</p>
                <p className="text-slate-400 text-xs">在地图上任意位置点击，即可将污染源移动到该位置</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                <p className="text-cyan-400 font-medium mb-1">控制图层显示</p>
                <p className="text-slate-400 text-xs">使用右上角面板切换热力图和等值线的显示</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                <p className="text-cyan-400 font-medium mb-1">调节透明度</p>
                <p className="text-slate-400 text-xs">拖动滑块调整热力图的透明度，便于观察底图</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 text-sm">
                <p className="text-cyan-400 font-medium mb-1">查看浓度信息</p>
                <p className="text-slate-400 text-xs">鼠标悬停在等值线上可查看该线的浓度值</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <LineChart className="w-4 h-4 text-cyan-400" />
              参数说明
            </h3>
            <div className="bg-slate-900/50 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left p-3 text-slate-400 font-medium">参数</th>
                    <th className="text-left p-3 text-slate-400 font-medium">单位</th>
                    <th className="text-left p-3 text-slate-400 font-medium">说明</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/50">
                    <td className="p-3 font-mono text-cyan-400">排放速率</td>
                    <td className="p-3">g/s</td>
                    <td className="p-3 text-slate-400">单位时间内排放的污染物质量</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-3 font-mono text-cyan-400">有效源高</td>
                    <td className="p-3">m</td>
                    <td className="p-3 text-slate-400">烟囱几何高度 + 烟气抬升高度</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="p-3 font-mono text-cyan-400">大气稳定度</td>
                    <td className="p-3">A-F</td>
                    <td className="p-3 text-slate-400">A极不稳定 → F中等稳定</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">混合层高度</td>
                    <td className="p-3">m</td>
                    <td className="p-3 text-slate-400">污染物垂直扩散的最大高度</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="pt-4 border-t border-slate-700">
            <h3 className="text-sm font-semibold text-white mb-3">大气稳定度分类</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                { code: 'A', desc: '极不稳定', color: 'bg-red-500/20 text-red-400' },
                { code: 'B', desc: '中等不稳定', color: 'bg-orange-500/20 text-orange-400' },
                { code: 'C', desc: '弱不稳定', color: 'bg-yellow-500/20 text-yellow-400' },
                { code: 'D', desc: '中性', color: 'bg-slate-500/20 text-slate-400' },
                { code: 'E', desc: '弱稳定', color: 'bg-blue-500/20 text-blue-400' },
                { code: 'F', desc: '中等稳定', color: 'bg-cyan-500/20 text-cyan-400' }
              ].map((item) => (
                <div
                  key={item.code}
                  className={`rounded-lg p-3 text-center ${item.color}`}
                >
                  <p className="text-lg font-bold">{item.code}</p>
                  <p className="text-[10px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
