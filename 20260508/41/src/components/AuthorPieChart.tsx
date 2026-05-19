import ReactECharts from 'echarts-for-react';
import type { AuthorContribution } from '../types';

interface AuthorPieChartProps {
  data: AuthorContribution[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

export function AuthorPieChart({ data }: AuthorPieChartProps) {
  const option = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
      },
      formatter: (params: any) => {
        return `<div>
          <div class="font-medium mb-1">${params.name}</div>
          <div>提交次数: <span class="font-medium">${params.value.toLocaleString()}</span></div>
          <div>占比: <span class="font-medium">${params.percent}%</span></div>
        </div>`;
      },
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: {
        color: '#6b7280',
        fontSize: 12,
      },
      formatter: (name: string) => {
        const item = data.find((d) => d.name === name);
        if (item) {
          return `${name}  ${item.percentage}%`;
        }
        return name;
      },
    },
    series: [
      {
        name: '作者贡献',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'bold',
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.2)',
          },
        },
        labelLine: {
          show: false,
        },
        data: data.map((item, index) => ({
          value: item.commits,
          name: item.name,
          itemStyle: {
            color: COLORS[index % COLORS.length],
          },
        })),
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-base font-semibold text-gray-800 mb-4">作者贡献分布</h3>
      <ReactECharts option={option} style={{ height: '350px' }} />
    </div>
  );
}
