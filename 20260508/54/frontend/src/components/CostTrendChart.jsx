import React from 'react';
import ReactECharts from 'echarts-for-react';

const CostTrendChart = ({ data }) => {
  const option = {
    title: {
      text: '成本趋势分析',
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['总花费', 'ECS', 'RDS', 'OSS'],
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data.map(item => item.date.slice(5))
    },
    yAxis: {
      type: 'value',
      name: '金额(元)'
    },
    series: [
      {
        name: '总花费',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.3 },
        data: data.map(item => item.total.toFixed(2)),
        lineStyle: { width: 2 },
        itemStyle: { color: '#5470c6' }
      },
      {
        name: 'ECS',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        data: data.map(item => item.ECS.toFixed(2)),
        lineStyle: { width: 1 },
        itemStyle: { color: '#91cc75' }
      },
      {
        name: 'RDS',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        data: data.map(item => item.RDS.toFixed(2)),
        lineStyle: { width: 1 },
        itemStyle: { color: '#fac858' }
      },
      {
        name: 'OSS',
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.2 },
        data: data.map(item => item.OSS.toFixed(2)),
        lineStyle: { width: 1 },
        itemStyle: { color: '#ee6666' }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 400 }} />;
};

export default CostTrendChart;
