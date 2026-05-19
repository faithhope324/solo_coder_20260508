import React from 'react';
import ReactECharts from 'echarts-for-react';

interface AgeAmountScatterProps {
  data: { age: number; amount: number; gender: string }[];
}

const AgeAmountScatter: React.FC<AgeAmountScatterProps> = ({ data }) => {
  const maleData = data.filter(item => item.gender === '男').map(item => [item.age, item.amount]);
  const femaleData = data.filter(item => item.gender === '女').map(item => [item.age, item.amount]);

  const option = {
    title: {
      text: '年龄 vs 理赔金额',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        return `年龄: ${params.value[0]}岁<br/>理赔金额: ${params.value[1].toFixed(2)}万元`;
      }
    },
    legend: {
      data: ['男性', '女性'],
      bottom: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '12%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: '年龄',
      nameLocation: 'middle',
      nameGap: 30,
      min: 0,
      max: 80
    },
    yAxis: {
      type: 'value',
      name: '理赔金额 (万元)',
      nameLocation: 'middle',
      nameGap: 50,
      axisLabel: {
        formatter: '{value}'
      }
    },
    series: [
      {
        name: '男性',
        type: 'scatter',
        data: maleData,
        symbolSize: 8,
        itemStyle: {
          color: '#5470c6',
          opacity: 0.6
        }
      },
      {
        name: '女性',
        type: 'scatter',
        data: femaleData,
        symbolSize: 8,
        itemStyle: {
          color: '#ee6666',
          opacity: 0.6
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

export default AgeAmountScatter;
