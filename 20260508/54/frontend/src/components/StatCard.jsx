import React from 'react';
import { Card, Statistic } from 'antd';

const StatCard = ({ title, value, prefix, suffix, color }) => (
  <Card>
    <Statistic
      title={title}
      value={value}
      prefix={prefix}
      suffix={suffix}
      valueStyle={{ color }}
    />
  </Card>
);

export default StatCard;
