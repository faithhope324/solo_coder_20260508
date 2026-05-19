import ReactECharts from 'echarts-for-react';
import type { DailyCommit } from '../types';

interface TrendChartProps {
  data: DailyCommit[];
}

export function TrendChart({ data }: TrendChartProps) {
  const option = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
      },
      formatter: (params: any) => {
        const date = params[0].axisValue;
        let result = `<div class="font-medium mb-1">${date}</div>`;
        params.forEach((param: any) => {
          const color = param.color;
          const name = param.seriesName;
          const value = param.value.toLocaleString();
          result += `<div class="flex items-center gap-2"><span style="display:inline-block;width:10px;height:10px;background:${color};border-radius:50%"></span><span>${name}:</span><span class="font-medium">${value}</span></div>`;
        });
        return result;
      },
    },
    legend: {
      data: ['提交次数', '新增行数', '删除行数'],
      top: 0,
      textStyle: {
        color: '#6b7280',
        fontSize: 12,
      },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map((d) => d.date),
      axisLine: {
        lineStyle: {
          color: '#e5e7eb',
        },
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
        rotate: 45,
      },
    },
    yAxis: [
      {
        type: 'value',
        name: '提交次数',
        position: 'left',
        axisLine: {
          lineStyle: {
            color: '#3b82f6',
          },
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
          },
        },
      },
      {
        type: 'value',
        name: '代码行数',
        position: 'right',
        axisLine: {
          lineStyle: {
            color: '#10b981',
          },
        },
        axisLabel: {
          color: '#6b7280',
          fontSize: 11,
        },
        splitLine: {
          show: false,
        },
      },
    ],
    series: [
      {
        name: '提交次数',
        type: 'line',
        smooth: true,
        yAxisIndex: 0,
        data: data.map((d) => d.commits),
        lineStyle: {
          width: 2,
          color: '#3b82f6',
        },
        itemStyle: {
          color: '#3b82f6',
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' },
            ],
          },
        },
      },
      {
        name: '新增行数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: data.map((d) => d.additions),
        lineStyle: {
          width: 2,
          color: '#10b981',
        },
        itemStyle: {
          color: '#10b981',
        },
      },
      {
        name: '删除行数',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: data.map((d) => d.deletions),
        lineStyle: {
          width: 2,
          color: '#ef4444',
        },
        itemStyle: {
          color: '#ef4444',
        },
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-base font-semibold text-gray-800 mb-4">提交趋势</h3>
      <ReactECharts option={option} style={{ height: '350px' }} />
    </div>
  );
}
