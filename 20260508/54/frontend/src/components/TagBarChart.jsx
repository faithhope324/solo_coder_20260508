import React from 'react';
import ReactECharts from 'echarts-for-react';

const TagBarChart = ({ title, data, color = '#5470c6' }) => {
  const option = {
    title: {
      text: title,
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}: ¥{c}'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.name),
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '金额(元)'
    },
    series: [
      {
        type: 'bar',
        data: data.map(item => item.value),
        itemStyle: {
          color: color,
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '50%',
        label: {
          show: true,
          position: 'top',
          formatter: '¥{c}'
        }
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 300 }} />;
};

export default TagBarChart;
