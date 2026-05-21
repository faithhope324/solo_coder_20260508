import React from 'react';
import ReactECharts from 'echarts-for-react';

const HistoricalChart = ({ data }) => {
  if (!data) {
    return (
      <div className="chart-container">
        <h3>📊 历史流量趋势（最近2小时）</h3>
        <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
          暂无历史数据
        </p>
      </div>
    );
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const timestamps = data.timestamps.map(formatTime);
  const flows = data.flows;

  const option = {
    title: {
      text: '📊 历史流量趋势（最近2小时）',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        return `<strong>${params[0].axisValue}</strong><br/>${params[0].marker} 流量: ${params[0].value.toFixed(1)} 辆/5分钟`;
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: timestamps,
      name: '时间',
      nameLocation: 'middle',
      nameGap: 30
    },
    yAxis: {
      type: 'value',
      name: '车流量（辆/5分钟）',
      nameLocation: 'middle',
      nameGap: 50
    },
    series: [
      {
        name: '历史流量',
        type: 'line',
        data: flows,
        smooth: true,
        lineStyle: {
          width: 2,
          color: '#722ed1'
        },
        itemStyle: {
          color: '#722ed1'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(114, 46, 209, 0.3)' },
              { offset: 1, color: 'rgba(114, 46, 209, 0.05)' }
            ]
          }
        }
      }
    ]
  };

  return (
    <div className="chart-container">
      <ReactECharts option={option} style={{ height: '300px' }} />
    </div>
  );
};

export default HistoricalChart;
