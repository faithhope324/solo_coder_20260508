const moment = require('moment');

const services = ['ECS', 'RDS', 'OSS'];
const environments = ['生产环境', '测试环境', '开发环境'];
const departments = ['技术部', '产品部', '运营部', '市场部'];

function generateDailyCosts(days = 30) {
  const data = [];
  const today = moment();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = today.clone().subtract(i, 'days').format('YYYY-MM-DD');
    const dayOfWeek = today.clone().subtract(i, 'days').day();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    services.forEach(service => {
      let baseCost;
      switch (service) {
        case 'ECS':
          baseCost = isWeekend ? 180 : 320;
          break;
        case 'RDS':
          baseCost = isWeekend ? 120 : 200;
          break;
        case 'OSS':
          baseCost = 50;
          break;
        default:
          baseCost = 100;
      }
      
      const variation = (Math.random() - 0.5) * 0.3 * baseCost;
      const cost = Math.max(10, baseCost + variation);
      
      data.push({
        date,
        service,
        cost: Number(cost.toFixed(2)),
        environment: environments[Math.floor(Math.random() * environments.length)],
        department: departments[Math.floor(Math.random() * departments.length)],
        instanceCount: service === 'ECS' ? Math.floor(Math.random() * 5) + 3 : 
                       service === 'RDS' ? Math.floor(Math.random() * 3) + 1 : 1
      });
    });
  }
  
  return data;
}

function generateInstanceDetails() {
  return [
    { id: 'i-abc001', name: 'web-server-01', service: 'ECS', cost: 12.5, cpuUsage: 8, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'i-abc002', name: 'web-server-02', service: 'ECS', cost: 12.5, cpuUsage: 12, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'i-abc003', name: 'test-server-01', service: 'ECS', cost: 8.2, cpuUsage: 3, status: 'running', environment: '测试环境', department: '产品部' },
    { id: 'i-abc004', name: 'dev-server-01', service: 'ECS', cost: 6.8, cpuUsage: 5, status: 'stopped', environment: '开发环境', department: '技术部' },
    { id: 'i-abc005', name: 'batch-server-01', service: 'ECS', cost: 15.3, cpuUsage: 85, status: 'running', environment: '生产环境', department: '运营部' },
    { id: 'i-abc006', name: 'app-server-01', service: 'ECS', cost: 14.2, cpuUsage: 65, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'i-abc007', name: 'app-server-02', service: 'ECS', cost: 14.2, cpuUsage: 72, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'i-abc008', name: 'cache-server-01', service: 'ECS', cost: 11.8, cpuUsage: 58, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'r-mysql001', name: 'mysql-prod-01', service: 'RDS', cost: 25.0, cpuUsage: 45, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'r-mysql002', name: 'mysql-test-01', service: 'RDS', cost: 12.0, cpuUsage: 10, status: 'running', environment: '测试环境', department: '产品部' },
    { id: 'r-redis001', name: 'redis-cache-01', service: 'RDS', cost: 18.0, cpuUsage: 60, status: 'running', environment: '生产环境', department: '技术部' },
    { id: 'o-backup001', name: 'backup-bucket', service: 'OSS', cost: 3.2, storageGB: 520, status: 'active', environment: '生产环境', department: '技术部' },
    { id: 'o-static001', name: 'static-assets', service: 'OSS', cost: 2.8, storageGB: 380, status: 'active', environment: '生产环境', department: '市场部' },
    { id: 'o-log001', name: 'log-storage', service: 'OSS', cost: 4.5, storageGB: 890, status: 'active', environment: '生产环境', department: '技术部' }
  ];
}

const dailyCosts = generateDailyCosts(30);
const instanceDetails = generateInstanceDetails();

module.exports = {
  dailyCosts,
  instanceDetails,
  services,
  environments,
  departments
};
