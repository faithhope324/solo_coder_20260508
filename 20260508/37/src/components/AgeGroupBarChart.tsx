import React from 'react';
import ReactECharts from 'echarts-for-react';

interface AgeGroupBarChartProps {
  data: { ageGroup: string; rate: number; claimCount: number; insuredCount: number }[];
}

const AgeGroupBarChart: React.FC<AgeGroupBarChartProps> = ({ data }) => {
  const option = {
    title: {
      text: '不同年龄段理赔率',
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
      formatter: (params: any) => {
        const item = data.find(d => d.ageGroup === params[0].name);
        return `${params[0].name}: ${params[0].value}%<br/>理赔人数: ${item?.claimCount.toLocaleString()}人<br/>参保人数: ${item?.insuredCount.toLocaleString()}人`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(item => item.ageGroup),
      name: '年龄段',
      axisLabel: {
        interval: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '理赔率',
      axisLabel: {
        formatter: '{value}%'
      },
      max: 10
    },
    series: [
      {
        name: '理赔率',
        type: 'bar',
        data: data.map(item => (item.rate * 100).toFixed(2)),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#ee6666' },
              { offset: 1, color: '#fac858' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%'
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

export default AgeGroupBarChart;
