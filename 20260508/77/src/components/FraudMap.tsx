import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTransactionStore } from '../store/useTransactionStore';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { Globe, AlertTriangle } from 'lucide-react';
import type { Transaction } from '../types';

interface FraudPoint {
  tx: Transaction;
  x: number;
  y: number;
}

const WORLD_MAP_PATH = `
  M0,0 L0,300 L900,300 L900,0 Z
  M150,80 Q180,60 220,70 Q260,80 280,100 Q300,120 290,150 Q280,180 250,190 Q220,200 180,195 Q140,190 120,170 Q100,150 110,120 Q120,90 150,80 Z
  M320,70 Q380,50 440,60 Q500,70 520,100 Q540,130 520,160 Q500,190 450,200 Q400,210 350,200 Q300,190 290,160 Q280,130 320,70 Z
  M550,100 Q620,80 700,90 Q780,100 800,130 Q820,160 800,190 Q780,220 720,230 Q660,240 600,230 Q540,220 530,190 Q520,160 550,100 Z
  M180,210 Q220,200 250,210 Q280,220 270,250 Q260,280 220,290 Q180,300 160,280 Q140,260 150,240 Q160,220 180,210 Z
  M450,210 Q500,200 540,210 Q580,220 570,250 Q560,280 520,290 Q480,300 450,285 Q420,270 430,250 Q440,230 450,210 Z
  M700,220 Q750,210 780,220 Q810,230 800,260 Q790,290 750,295 Q710,300 690,280 Q670,260 680,240 Q690,220 700,220 Z
`;

export function FraudMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const { transactions } = useTransactionStore();
  const [hoveredTx, setHoveredTx] = useState<Transaction | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const fraudPointsRef = useRef<Map<string, FraudPoint>>(new Map());

  const fraudTransactions = transactions.filter((tx) => tx.isFraud);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = 350;

    const projection = d3.geoEquirectangular().scale(140).translate([width / 2, height / 2]);

    fraudPointsRef.current.clear();

    fraudTransactions.forEach((tx) => {
      const coords: [number, number] = [tx.lng, tx.lat];
      const projected = projection(coords);
      if (projected) {
        fraudPointsRef.current.set(tx.id, {
          tx,
          x: projected[0],
          y: projected[1],
        });
      }
    });

    const points = svg.selectAll('.fraud-point').data(fraudTransactions, (d: any) => d.id);

    points.exit().remove();

    const pointsEnter = points
      .enter()
      .append('g')
      .attr('class', 'fraud-point')
      .attr('transform', (d: any) => {
        const point = fraudPointsRef.current.get(d.id);
        return point ? `translate(${point.x}, ${point.y})` : 'translate(0,0)';
      });

    pointsEnter
      .append('circle')
      .attr('r', 0)
      .attr('fill', 'none')
      .attr('stroke', '#f87171')
      .attr('stroke-width', 2)
      .attr('opacity', 0.8)
      .transition()
      .duration(500)
      .attr('r', 18)
      .attr('opacity', 0);

    pointsEnter
      .append('circle')
      .attr('r', 0)
      .attr('fill', '#f87171')
      .attr('opacity', 0.9)
      .on('mouseenter', function (event: MouseEvent, d: any) {
        setHoveredTx(d);
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mousemove', function (event: MouseEvent) {
        setTooltipPos({ x: event.clientX, y: event.clientY });
      })
      .on('mouseleave', function () {
        setHoveredTx(null);
      })
      .transition()
      .duration(500)
      .attr('r', 7);

    pointsEnter
      .append('circle')
      .attr('r', 0)
      .attr('fill', '#fecaca')
      .attr('opacity', 1)
      .transition()
      .duration(500)
      .attr('r', 4);

    points
      .transition()
      .duration(300)
      .attr('transform', (d: any) => {
        const point = fraudPointsRef.current.get(d.id);
        return point ? `translate(${point.x}, ${point.y})` : 'translate(0,0)';
      });
  }, [fraudTransactions]);

  return (
    <div className="relative bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-200">欺诈交易地图</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-slate-400 font-mono">
                {fraudTransactions.length} 个活跃预警
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative p-4">
        <svg ref={svgRef} className="w-full h-80" viewBox="0 0 900 350" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#075985" stopOpacity="0.6" />
            </linearGradient>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.4" />
            </pattern>
          </defs>

          <rect width="900" height="350" fill="url(#oceanGradient)" />
          <rect width="900" height="350" fill="url(#gridPattern)" />

          <path
            d={WORLD_MAP_PATH}
            fill="#1e40af"
            stroke="#60a5fa"
            strokeWidth="0.8"
            opacity="0.7"
          />

          <line x1="0" y1="175" x2="900" y2="175" stroke="#60a5fa" strokeWidth="0.5" opacity="0.5" strokeDasharray="5,5" />
          <line x1="450" y1="0" x2="450" y2="350" stroke="#60a5fa" strokeWidth="0.5" opacity="0.5" strokeDasharray="5,5" />
        </svg>

        {hoveredTx && (
          <div
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPos.x + 15,
              top: tooltipPos.y + 15,
            }}
          >
            <div className="bg-slate-800/95 backdrop-blur-sm border border-red-500/50 rounded-lg p-3 shadow-xl shadow-red-500/20 min-w-56">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-700">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400 tracking-wider">
                  欺诈预警
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">金额:</span>
                  <span className="text-red-400 font-mono font-semibold">
                    {formatCurrency(hoveredTx.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">商户:</span>
                  <span className="text-slate-200">{hoveredTx.merchant}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">位置:</span>
                  <span className="text-slate-200">{hoveredTx.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">风险评分:</span>
                  <span className="text-red-400 font-mono">{hoveredTx.fraudScore.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">时间:</span>
                  <span className="text-slate-300 font-mono text-[10px]">
                    {formatDateTime(hoveredTx.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
