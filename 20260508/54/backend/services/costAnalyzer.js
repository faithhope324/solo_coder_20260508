const { dailyCosts, instanceDetails } = require('../data/mockData');

function getCostTrend() {
  const dateMap = {};
  
  dailyCosts.forEach(item => {
    if (!dateMap[item.date]) {
      dateMap[item.date] = { date: item.date, total: 0, ECS: 0, RDS: 0, OSS: 0 };
    }
    dateMap[item.date].total += item.cost;
    dateMap[item.date][item.service] += item.cost;
  });
  
  return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
}

function getServiceDistribution() {
  const serviceMap = { ECS: 0, RDS: 0, OSS: 0 };
  
  dailyCosts.forEach(item => {
    serviceMap[item.service] += item.cost;
  });
  
  const total = serviceMap.ECS + serviceMap.RDS + serviceMap.OSS;
  
  return Object.entries(serviceMap).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
    percentage: Number(((value / total) * 100).toFixed(1))
  }));
}

function getCostByTag(tagType) {
  const tagMap = {};
  
  dailyCosts.forEach(item => {
    const tag = item[tagType];
    if (!tagMap[tag]) {
      tagMap[tag] = 0;
    }
    tagMap[tag] += item.cost;
  });
  
  return Object.entries(tagMap)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2))
    }))
    .sort((a, b) => b.value - a.value);
}

function getCostByEnvironment() {
  return getCostByTag('environment');
}

function getCostByDepartment() {
  return getCostByTag('department');
}

function getSavingsSuggestions() {
  const suggestions = [];
  
  const idleInstances = instanceDetails.filter(
    inst => inst.service === 'ECS' && inst.cpuUsage < 15 && inst.status === 'running'
  );
  
  if (idleInstances.length > 0) {
    const monthlySavings = idleInstances.reduce((sum, inst) => sum + inst.cost * 30, 0);
    suggestions.push({
      id: 'idle-instances',
      type: 'idle',
      title: '闲置实例优化',
      description: `发现 ${idleInstances.length} 台ECS实例CPU使用率长期低于15%，属于闲置资源`,
      instances: idleInstances.map(i => ({ id: i.id, name: i.name, cpuUsage: i.cpuUsage, dailyCost: i.cost })),
      monthlySavings: Number(monthlySavings.toFixed(2)),
      priority: 'high',
      action: '建议停止或降配这些实例'
    });
  }
  
  const stoppedInstances = instanceDetails.filter(
    inst => inst.service === 'ECS' && inst.status === 'stopped'
  );
  
  if (stoppedInstances.length > 0) {
    const stoppedSavings = stoppedInstances.reduce((sum, inst) => sum + inst.cost * 30, 0);
    suggestions.push({
      id: 'stopped-instances',
      type: 'stopped',
      title: '已停止实例清理',
      description: `发现 ${stoppedInstances.length} 台ECS实例已停止但仍在产生费用`,
      instances: stoppedInstances.map(i => ({ id: i.id, name: i.name, dailyCost: i.cost })),
      monthlySavings: Number(stoppedSavings.toFixed(2)),
      priority: 'medium',
      action: '建议释放这些实例或转为按量付费'
    });
  }
  
  const idleInstanceIds = new Set(idleInstances.map(inst => inst.id));
  const runningECS = instanceDetails.filter(
    inst => inst.service === 'ECS' && inst.status === 'running' && !idleInstanceIds.has(inst.id)
  );
  if (runningECS.length >= 3) {
    const totalMonthlyCost = runningECS.reduce((sum, inst) => sum + inst.cost, 0) * 30;
    const reservedSavings = totalMonthlyCost * 0.3;
    suggestions.push({
      id: 'reserved-instances',
      type: 'reserved',
      title: '预留实例推荐',
      description: `您有 ${runningECS.length} 台长期运行的ECS实例，建议转为预留实例`,
      instanceCount: runningECS.length,
      monthlySavings: Number(reservedSavings.toFixed(2)),
      priority: 'high',
      action: '购买1年预留实例可节省约30%成本'
    });
  }
  
  const ossInstances = instanceDetails.filter(inst => inst.service === 'OSS');
  const totalStorage = ossInstances.reduce((sum, inst) => sum + (inst.storageGB || 0), 0);
  if (totalStorage > 500) {
    const ossSavings = totalStorage * 0.02;
    suggestions.push({
      id: 'oss-storage',
      type: 'storage',
      title: 'OSS存储优化',
      description: `当前OSS存储总量 ${totalStorage}GB，建议配置生命周期策略`,
      totalStorage,
      monthlySavings: Number(ossSavings.toFixed(2)),
      priority: 'low',
      action: '将冷数据转为低频访问存储'
    });
  }
  
  const lowUsageRDS = instanceDetails.filter(
    inst => inst.service === 'RDS' && inst.cpuUsage < 20
  );
  
  if (lowUsageRDS.length > 0) {
    const rdsSavings = lowUsageRDS.reduce((sum, inst) => sum + inst.cost * 30 * 0.4, 0);
    suggestions.push({
      id: 'rds-downsize',
      type: 'downsize',
      title: 'RDS实例降配',
      description: `发现 ${lowUsageRDS.length} 个RDS实例CPU使用率较低`,
      instances: lowUsageRDS.map(i => ({ id: i.id, name: i.name, cpuUsage: i.cpuUsage, dailyCost: i.cost })),
      monthlySavings: Number(rdsSavings.toFixed(2)),
      priority: 'medium',
      action: '建议降低实例规格，预计节省40%成本'
    });
  }
  
  return suggestions;
}

function getSummary() {
  const totalCost = dailyCosts.reduce((sum, item) => sum + item.cost, 0);
  const suggestions = getSavingsSuggestions();
  const totalSavings = suggestions.reduce((sum, s) => sum + s.monthlySavings, 0);
  
  const uniqueDates = new Set(dailyCosts.map(item => item.date));
  const actualDays = uniqueDates.size;
  
  return {
    totalCost: Number(totalCost.toFixed(2)),
    dailyAverage: Number((totalCost / actualDays).toFixed(2)),
    actualDays,
    instanceCount: instanceDetails.length,
    serviceCount: 3,
    totalMonthlySavings: Number(totalSavings.toFixed(2)),
    savingsPercentage: Number(((totalSavings / totalCost) * 100).toFixed(1))
  };
}

function getMonthlyReport(year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const filtered = dailyCosts.filter(item => item.date.startsWith(monthStr));
  
  if (filtered.length === 0) {
    return null;
  }
  
  const dailyTotals = {};
  const serviceTotals = { ECS: 0, RDS: 0, OSS: 0 };
  const envTotals = {};
  const deptTotals = {};
  
  filtered.forEach(item => {
    if (!dailyTotals[item.date]) {
      dailyTotals[item.date] = 0;
    }
    dailyTotals[item.date] += item.cost;
    serviceTotals[item.service] += item.cost;
    
    if (!envTotals[item.environment]) {
      envTotals[item.environment] = 0;
    }
    envTotals[item.environment] += item.cost;
    
    if (!deptTotals[item.department]) {
      deptTotals[item.department] = 0;
    }
    deptTotals[item.department] += item.cost;
  });
  
  const total = Object.values(dailyTotals).reduce((sum, v) => sum + v, 0);
  
  return {
    month: monthStr,
    totalCost: Number(total.toFixed(2)),
    dailyDetails: Object.entries(dailyTotals).map(([date, cost]) => ({ date, cost: Number(cost.toFixed(2)) })),
    serviceBreakdown: Object.entries(serviceTotals).map(([service, cost]) => ({ service, cost: Number(cost.toFixed(2)), percentage: Number(((cost / total) * 100).toFixed(1)) })),
    environmentBreakdown: Object.entries(envTotals).map(([env, cost]) => ({ environment: env, cost: Number(cost.toFixed(2)), percentage: Number(((cost / total) * 100).toFixed(1)) })),
    departmentBreakdown: Object.entries(deptTotals).map(([dept, cost]) => ({ department: dept, cost: Number(cost.toFixed(2)), percentage: Number(((cost / total) * 100).toFixed(1)) }))
  };
}

module.exports = {
  getCostTrend,
  getServiceDistribution,
  getCostByEnvironment,
  getCostByDepartment,
  getSavingsSuggestions,
  getSummary,
  getMonthlyReport
};
