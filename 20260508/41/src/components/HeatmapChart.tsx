import ReactECharts from 'echarts-for-react';
import type { FileExtensionStats } from '../types';

interface HeatmapChartProps {
  data: FileExtensionStats[];
}

export function HeatmapChart({ data }: HeatmapChartProps) {
  const extensions = data.map((d) => d.extension);
  const metrics = ['修改次数', '新增行数', '删除行数'];
  
  const heatmapData: number[][] = [];
  data.forEach((item, i) => {
    heatmapData.push([i, 0, item.count]);
    heatmapData.push([i, 1, item.additions]);
    heatmapData.push([i, 2, item.deletions]);
  });

  const maxCount = Math.max(...data.map((d) => d.count));
  const maxAdditions = Math.max(...data.map((d) => d.additions));
  const maxDeletions = Math.max(...data.map((d) => d.deletions));
  const maxValue = Math.max(maxCount, maxAdditions, maxDeletions);

  const option = {
    tooltip: {
      position: 'top',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      textStyle: {
        color: '#374151',
      },
      formatter: (params: any) => {
        const ext = extensions[params.data[0]];
        const metric = metrics[params.data[1]];
        const value = params.data[2].toLocaleString();
        return `<div class="font-medium mb-1">${ext}</div><div>${metric}: <span class="font-medium">${value}</span></div>`;
      },
    },
    grid: {
      left: '15%',
      right: '5%',
      bottom: '15%',
      top: '5%',
    },
    xAxis: {
      type: 'category',
      data: extensions,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
        rotate: 45,
      },
    },
    yAxis: {
      type: 'category',
      data: metrics,
      splitArea: {
        show: true,
      },
      axisLabel: {
        color: '#6b7280',
        fontSize: 11,
      },
    },
    visualMap: {
      min: 0,
      max: maxValue,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      textStyle: {
        color: '#6b7280',
        fontSize: 11,
      },
      inRange: {
        color: ['#dbeafe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'],
      },
    },
    series: [
      {
        name: '文件修改统计',
        type: 'heatmap',
        data: heatmapData,
        label: {
          show: true,
          color: '#fff',
          fontSize: 10,
          formatter: (params: any) => params.data[2].toLocaleString(),
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.3)',
          },
        },
      },
    ],
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-base font-semibold text-gray-800 mb-4">文件类型修改热力图</h3>
      <ReactECharts option={option} style={{ height: '350px' }} />
    </div>
  );
}
