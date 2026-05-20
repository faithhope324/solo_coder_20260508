const express = require('express');
const cors = require('cors');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const {
  getCostTrend,
  getServiceDistribution,
  getCostByEnvironment,
  getCostByDepartment,
  getSavingsSuggestions,
  getSummary,
  getMonthlyReport
} = require('./services/costAnalyzer');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '云成本优化分析系统 API 运行正常' });
});

app.get('/api/summary', (req, res) => {
  try {
    const summary = getSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: '获取汇总数据失败' });
  }
});

app.get('/api/cost-trend', (req, res) => {
  try {
    const trend = getCostTrend();
    res.json(trend);
  } catch (error) {
    res.status(500).json({ error: '获取成本趋势失败' });
  }
});

app.get('/api/service-distribution', (req, res) => {
  try {
    const distribution = getServiceDistribution();
    res.json(distribution);
  } catch (error) {
    res.status(500).json({ error: '获取服务分布失败' });
  }
});

app.get('/api/cost-by-environment', (req, res) => {
  try {
    const data = getCostByEnvironment();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '获取环境成本统计失败' });
  }
});

app.get('/api/cost-by-department', (req, res) => {
  try {
    const data = getCostByDepartment();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '获取部门成本统计失败' });
  }
});

app.get('/api/savings-suggestions', (req, res) => {
  try {
    const suggestions = getSavingsSuggestions();
    res.json(suggestions);
  } catch (error) {
    res.status(500).json({ error: '获取节省建议失败' });
  }
});

app.get('/api/monthly-report', (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) : moment().month() + 1;
    
    const report = getMonthlyReport(currentYear, currentMonth);
    
    if (!report) {
      return res.status(404).json({ error: '该月份没有数据' });
    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: '获取月度报告失败' });
  }
});

app.get('/api/export/monthly-report', async (req, res) => {
  try {
    const { year, month } = req.query;
    const currentYear = year ? parseInt(year) : moment().year();
    const currentMonth = month ? parseInt(month) : moment().month() + 1;
    
    const report = getMonthlyReport(currentYear, currentMonth);
    
    if (!report) {
      return res.status(404).json({ error: '该月份没有数据' });
    }

    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const csvFilePath = path.join(exportsDir, `monthly-report-${currentYear}-${String(currentMonth).padStart(2, '0')}.csv`);

    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        { id: 'category', title: '分类' },
        { id: 'item', title: '项目' },
        { id: 'cost', title: '费用(元)' },
        { id: 'percentage', title: '占比(%)' }
      ]
    });

    const records = [];

    records.push({ category: '月度汇总', item: '总费用', cost: report.totalCost, percentage: 100 });
    records.push({ category: '', item: '', cost: '', percentage: '' });

    records.push({ category: '服务类型', item: '', cost: '', percentage: '' });
    report.serviceBreakdown.forEach(item => {
      records.push({ category: '', item: item.service, cost: item.cost, percentage: item.percentage });
    });
    records.push({ category: '', item: '', cost: '', percentage: '' });

    records.push({ category: '环境分布', item: '', cost: '', percentage: '' });
    report.environmentBreakdown.forEach(item => {
      records.push({ category: '', item: item.environment, cost: item.cost, percentage: item.percentage });
    });
    records.push({ category: '', item: '', cost: '', percentage: '' });

    records.push({ category: '部门分布', item: '', cost: '', percentage: '' });
    report.departmentBreakdown.forEach(item => {
      records.push({ category: '', item: item.department, cost: item.cost, percentage: item.percentage });
    });
    records.push({ category: '', item: '', cost: '', percentage: '' });

    records.push({ category: '每日明细', item: '', cost: '', percentage: '' });
    report.dailyDetails.forEach(item => {
      records.push({ category: '', item: item.date, cost: item.cost, percentage: '' });
    });

    await csvWriter.writeRecords(records);

    res.download(csvFilePath, `云成本月度报告-${currentYear}-${String(currentMonth).padStart(2, '0')}.csv`, (err) => {
      if (err) {
        console.error('下载文件失败:', err);
        res.status(500).json({ error: '导出失败' });
      }
    });
  } catch (error) {
    console.error('导出报告失败:', error);
    res.status(500).json({ error: '导出月度报告失败' });
  }
});

app.listen(PORT, () => {
  console.log(`云成本优化分析系统 API 服务已启动: http://localhost:${PORT}`);
  console.log(`健康检查: http://localhost:${PORT}/api/health`);
});
