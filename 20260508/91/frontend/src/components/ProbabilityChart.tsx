import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface ProbabilityChartProps {
  probabilities: Record<string, number>
}

const ProbabilityChart: React.FC<ProbabilityChartProps> = ({ probabilities }) => {
  const data = Object.entries(probabilities)
    .map(([state, prob]) => ({
      state,
      probability: Math.round(prob * 10000) / 100,
    }))
    .sort((a, b) => a.state.localeCompare(b.state))

  const colors = ['#4f46e5', '#059669', '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#be185d', '#374151']

  return (
    <div className="probability-chart">
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="state"
            tick={{ fontSize: 10 }}
            angle={-45}
            textAnchor="end"
            height={40}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={[0, 100]}
            tickFormatter={value => `${value}%`}
          />
          <Tooltip
            formatter={(value: number) => [`${value}%`, '概率']}
            labelFormatter={label => `状态: |${label}⟩`}
          />
          <Bar dataKey="probability" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default ProbabilityChart