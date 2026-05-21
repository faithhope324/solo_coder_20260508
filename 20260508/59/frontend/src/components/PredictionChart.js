import React from 'react';
import ReactECharts from 'echarts-for-react';

const PredictionChart = ({ data, historical }) => {
  if (!data) {
    return (
      <div className="chart-container">
        <h3>📈 交通流量预测（未来30分钟）</h3>
        <p style={{ textAlign: 'center', color: '#999', padding: '40px' }}>
          暂无预测数据，请先初始化系统并获取预测
        </p>
      </div>
    );
  }

  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const timestamps = data.timestamps.map(formatTime);
  const meanValues = data.mean;
  const lowerValues = data.lower;
  const upperValues = data.upper;

  const option = {
    title: {
      text: '📈 交通流量预测（未来30分钟）',
      left: 'center',
      textStyle: { fontSize: 16, fontWeight: 'bold' }
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        let result = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach(param => {
          result += `${param.marker} ${param.seriesName}: ${param.value.toFixed(1)} 辆/5分钟<br/>`;
        });
        return result;
      }
    },
    legend: {
      data: ['预测值', '置信区间上界', '置信区间下界'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 80,
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
        name: '预测值',
        type: 'line',
        data: meanValues,
        smooth: true,
        lineStyle: {
          width: 3,
          color: '#1890ff'
        },
        itemStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(24, 144, 255, 0.4)' },
              { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
            ]
          }
        }
      },
      {
        name: '置信区间上界',
        type: 'line',
        data: upperValues,
        smooth: true,
        lineStyle: {
          type: 'dashed',
          width: 1,
          color: '#52c41a'
        },
        itemStyle: {
          color: '#52c41a'
        },
        symbol: 'none'
      },
      {
        name: '置信区间下界',
        type: 'line',
        data: lowerValues,
        smooth: true,
        lineStyle: {
          type: 'dashed',
          width: 1,
          color: '#fa8c16'
        },
        itemStyle: {
          color: '#fa8c16'
        },
        symbol: 'none'
      }
    ]
  };

  return (
    <div className="chart-container">
      <ReactECharts option={option} style={{ height: '400px' }} />
    </div>
  );
};

export default PredictionChart;
