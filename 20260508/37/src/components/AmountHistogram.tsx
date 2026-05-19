import React from 'react';
import ReactECharts from 'echarts-for-react';

interface AmountHistogramProps {
  data: { range: string; count: number; avgAmount: number }[];
}

const AmountHistogram: React.FC<AmountHistogramProps> = ({ data }) => {
  const option = {
    title: {
      text: '理赔金额分布',
      subtext: '单位：万元',
      left: 'center',
      subtextStyle: {
        fontSize: 12,
        color: '#999'
      },
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
        const item = data.find(d => d.range === params[0].name);
        return `${params[0].name}: ${params[0].value} 人<br/>平均赔付: ${item?.avgAmount.toFixed(2)}万元`;
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
      data: data.map(item => item.range),
      name: '金额区间（万元）',
      axisLabel: {
        interval: 0,
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '人数'
    },
    series: [
      {
        name: '人数',
        type: 'bar',
        data: data.map(item => item.count),
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#5470c6' },
              { offset: 1, color: '#91cc75' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        },
        label: {
          show: true,
          position: 'top'
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

export default AmountHistogram;
