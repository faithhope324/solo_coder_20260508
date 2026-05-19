import React from 'react';
import ReactECharts from 'echarts-for-react';

interface TopDiseasesBarChartProps {
  data: { disease: string; count: number }[];
}

const TopDiseasesBarChart: React.FC<TopDiseasesBarChartProps> = ({ data }) => {
  const sortedData = [...data].sort((a, b) => a.count - b.count);

  const option = {
    title: {
      text: '常见疾病 TOP10',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: '{b}: {c} 人'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '人数'
    },
    yAxis: {
      type: 'category',
      data: sortedData.map(item => item.disease)
    },
    series: [
      {
        name: '人数',
        type: 'bar',
        data: sortedData.map(item => item.count),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#73c0de' },
              { offset: 1, color: '#3ba272' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right'
        }
      }
    ]
  };

  return (
    <div className="chart-container">
      <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
    </div>
  );
};

export default TopDiseasesBarChart;
