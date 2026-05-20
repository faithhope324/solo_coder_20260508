import React from 'react';
import ReactECharts from 'echarts-for-react';

const ServicePieChart = ({ data }) => {
  const option = {
    title: {
      text: '服务成本分布',
      left: 'center',
      textStyle: { fontSize: 16 }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '服务类型',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: true
        },
        data: data.map(item => ({
          value: item.value,
          name: item.name
        }))
      }
    ]
  };

  return <ReactECharts option={option} style={{ height: 350 }} />;
};

export default ServicePieChart;
