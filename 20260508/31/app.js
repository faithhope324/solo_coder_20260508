const departmentIcons = {
  '销售部': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  '市场部': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>`,
  '研发部': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="16" x="8" y="8" rx="2" ry="2"/><path d="M5 16V4a2 2 0 0 1 2-2h12"/><path d="M5 16H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2"/><path d="M9 16h10a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9"/></svg>`,
  '运营部': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  '财务部': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/><path d="M14 15h4"/></svg>`,
  '人力资源': `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`
};

const mockData = {
  Q1: {
    departments: [
      { id: 'sales', name: '销售部', kpiTarget: 1000000, kpiCurrent: 875000, trend: [72, 78, 82, 85, 87, 88] },
      { id: 'marketing', name: '市场部', kpiTarget: 500000, kpiCurrent: 520000, trend: [88, 92, 95, 98, 102, 104] },
      { id: 'engineering', name: '研发部', kpiTarget: 20, kpiCurrent: 17, trend: [65, 70, 75, 80, 83, 85] },
      { id: 'operations', name: '运营部', kpiTarget: 500, kpiCurrent: 420, trend: [70, 75, 78, 80, 82, 84] },
      { id: 'finance', name: '财务部', kpiTarget: 100, kpiCurrent: 95, trend: [85, 88, 90, 92, 94, 95] },
      { id: 'hr', name: '人力资源', kpiTarget: 80, kpiCurrent: 88, trend: [95, 98, 102, 105, 108, 110] }
    ],
    employees: [
      { id: 1, name: '张伟', department: '销售部', sales: 125000, completionRate: 125, rating: 'S' },
      { id: 2, name: '李娜', department: '市场部', sales: 98000, completionRate: 112, rating: 'A' },
      { id: 3, name: '王芳', department: '销售部', sales: 95000, completionRate: 95, rating: 'B' },
      { id: 4, name: '刘强', department: '研发部', sales: 88000, completionRate: 110, rating: 'A' },
      { id: 5, name: '陈明', department: '销售部', sales: 85000, completionRate: 85, rating: 'B' },
      { id: 6, name: '杨丽', department: '运营部', sales: 82000, completionRate: 105, rating: 'A' },
      { id: 7, name: '赵强', department: '研发部', sales: 78000, completionRate: 98, rating: 'B' },
      { id: 8, name: '黄敏', department: '市场部', sales: 72000, completionRate: 90, rating: 'B' },
      { id: 9, name: '周杰', department: '销售部', sales: 68000, completionRate: 68, rating: 'C' },
      { id: 10, name: '吴婷', department: '财务部', sales: 65000, completionRate: 108, rating: 'A' }
    ]
  },
  Q2: {
    departments: [
      { id: 'sales', name: '销售部', kpiTarget: 1200000, kpiCurrent: 1150000, trend: [85, 88, 90, 92, 94, 96] },
      { id: 'marketing', name: '市场部', kpiTarget: 600000, kpiCurrent: 570000, trend: [90, 92, 94, 95, 96, 95] },
      { id: 'engineering', name: '研发部', kpiTarget: 25, kpiCurrent: 24, trend: [78, 82, 86, 90, 94, 96] },
      { id: 'operations', name: '运营部', kpiTarget: 600, kpiCurrent: 580, trend: [78, 82, 86, 90, 94, 97] },
      { id: 'finance', name: '财务部', kpiTarget: 120, kpiCurrent: 118, trend: [90, 92, 94, 96, 98, 98] },
      { id: 'hr', name: '人力资源', kpiTarget: 90, kpiCurrent: 92, trend: [98, 100, 102, 102, 103, 102] }
    ],
    employees: [
      { id: 1, name: '张伟', department: '销售部', sales: 156000, completionRate: 130, rating: 'S' },
      { id: 2, name: '李娜', department: '市场部', sales: 125000, completionRate: 125, rating: 'S' },
      { id: 3, name: '王芳', department: '销售部', sales: 118000, completionRate: 98, rating: 'A' },
      { id: 4, name: '刘强', department: '研发部', sales: 105000, completionRate: 117, rating: 'A' },
      { id: 5, name: '陈明', department: '销售部', sales: 102000, completionRate: 85, rating: 'B' },
      { id: 6, name: '杨丽', department: '运营部', sales: 98000, completionRate: 115, rating: 'A' },
      { id: 7, name: '赵强', department: '研发部', sales: 92000, completionRate: 102, rating: 'A' },
      { id: 8, name: '黄敏', department: '市场部', sales: 88000, completionRate: 98, rating: 'B' },
      { id: 9, name: '周杰', department: '销售部', sales: 85000, completionRate: 71, rating: 'C' },
      { id: 10, name: '吴婷', department: '财务部', sales: 82000, completionRate: 110, rating: 'A' }
    ]
  },
  Q3: {
    departments: [
      { id: 'sales', name: '销售部', kpiTarget: 1300000, kpiCurrent: 980000, trend: [90, 88, 85, 82, 78, 75] },
      { id: 'marketing', name: '市场部', kpiTarget: 650000, kpiCurrent: 620000, trend: [92, 94, 95, 96, 95, 95] },
      { id: 'engineering', name: '研发部', kpiTarget: 28, kpiCurrent: 26, trend: [88, 90, 92, 93, 92, 93] },
      { id: 'operations', name: '运营部', kpiTarget: 650, kpiCurrent: 600, trend: [85, 88, 90, 92, 93, 92] },
      { id: 'finance', name: '财务部', kpiTarget: 130, kpiCurrent: 128, trend: [92, 94, 96, 98, 99, 98] },
      { id: 'hr', name: '人力资源', kpiTarget: 95, kpiCurrent: 90, trend: [100, 98, 96, 95, 95, 95] }
    ],
    employees: [
      { id: 1, name: '张伟', department: '销售部', sales: 142000, completionRate: 118, rating: 'S' },
      { id: 2, name: '李娜', department: '市场部', sales: 135000, completionRate: 135, rating: 'S' },
      { id: 3, name: '王芳', department: '销售部', sales: 128000, completionRate: 107, rating: 'A' },
      { id: 4, name: '刘强', department: '研发部', sales: 115000, completionRate: 128, rating: 'S' },
      { id: 5, name: '陈明', department: '销售部', sales: 98000, completionRate: 82, rating: 'B' },
      { id: 6, name: '杨丽', department: '运营部', sales: 108000, completionRate: 127, rating: 'A' },
      { id: 7, name: '赵强', department: '研发部', sales: 95000, completionRate: 106, rating: 'A' },
      { id: 8, name: '黄敏', department: '市场部', sales: 92000, completionRate: 102, rating: 'A' },
      { id: 9, name: '周杰', department: '销售部', sales: 78000, completionRate: 65, rating: 'C' },
      { id: 10, name: '吴婷', department: '财务部', sales: 88000, completionRate: 118, rating: 'A' }
    ]
  },
  Q4: {
    departments: [
      { id: 'sales', name: '销售部', kpiTarget: 1500000, kpiCurrent: 1420000, trend: [75, 78, 82, 86, 90, 95] },
      { id: 'marketing', name: '市场部', kpiTarget: 700000, kpiCurrent: 680000, trend: [90, 92, 94, 96, 97, 97] },
      { id: 'engineering', name: '研发部', kpiTarget: 30, kpiCurrent: 29, trend: [88, 90, 92, 94, 96, 97] },
      { id: 'operations', name: '运营部', kpiTarget: 700, kpiCurrent: 690, trend: [88, 90, 92, 94, 97, 99] },
      { id: 'finance', name: '财务部', kpiTarget: 140, kpiCurrent: 139, trend: [94, 96, 98, 99, 99, 99] },
      { id: 'hr', name: '人力资源', kpiTarget: 100, kpiCurrent: 98, trend: [92, 94, 96, 97, 98, 98] }
    ],
    employees: [
      { id: 1, name: '张伟', department: '销售部', sales: 175000, completionRate: 146, rating: 'S' },
      { id: 2, name: '李娜', department: '市场部', sales: 145000, completionRate: 145, rating: 'S' },
      { id: 3, name: '王芳', department: '销售部', sales: 138000, completionRate: 115, rating: 'A' },
      { id: 4, name: '刘强', department: '研发部', sales: 125000, completionRate: 139, rating: 'S' },
      { id: 5, name: '陈明', department: '销售部', sales: 118000, completionRate: 98, rating: 'B' },
      { id: 6, name: '杨丽', department: '运营部', sales: 115000, completionRate: 135, rating: 'A' },
      { id: 7, name: '赵强', department: '研发部', sales: 108000, completionRate: 120, rating: 'A' },
      { id: 8, name: '黄敏', department: '市场部', sales: 102000, completionRate: 113, rating: 'A' },
      { id: 9, name: '周杰', department: '销售部', sales: 95000, completionRate: 79, rating: 'C' },
      { id: 10, name: '吴婷', department: '财务部', sales: 98000, completionRate: 131, rating: 'A' }
    ]
  }
};

let currentQuarter = 'Q2';
let currentSort = { field: 'rank', direction: 'desc' };

function formatNumber(num) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    maximumFractionDigits: 0
  }).format(num);
}

function formatCurrency(num) {
  return '¥' + formatNumber(num);
}

function getCompletionClass(rate) {
  if (rate >= 100) return 'success';
  if (rate >= 80) return 'warning';
  return 'danger';
}

function calculateTrendChange(trend) {
  if (trend.length < 2) return 0;
  const first = trend[0];
  const last = trend[trend.length - 1];
  return ((last - first) / first) * 100;
}

function createSparkline(trend, isUp) {
  const width = 240;
  const height = 40;
  const padding = 4;
  
  const min = Math.min(...trend);
  const max = Math.max(...trend);
  const range = max - min || 1;
  
  const points = trend.map((value, index) => {
    const x = padding + (index / (trend.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  const areaPoints = `${padding},${height} ${points} ${width - padding},${height}`;
  
  const color = isUp ? '#10b981' : '#ef4444';
  
  return `
    <svg class="sparkline-svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
      <polygon class="sparkline-area" points="${areaPoints}" fill="${color}"/>
      <polyline class="sparkline-line" points="${points}" stroke="${color}"/>
      <circle class="sparkline-dot" cx="${width - padding}" cy="${height - padding - ((trend[trend.length - 1] - min) / range) * (height - padding * 2)}" fill="${color}"/>
    </svg>
  `;
}

function renderDepartmentCards() {
  const container = document.getElementById('department-cards');
  const data = mockData[currentQuarter];
  
  container.innerHTML = data.departments.map(dept => {
    const completionRate = Math.round((dept.kpiCurrent / dept.kpiTarget) * 100);
    const trendChange = calculateTrendChange(dept.trend);
    const isUp = trendChange >= 0;
    const progressClass = getCompletionClass(completionRate);
    
    return `
      <div class="department-card">
        <div class="card-header">
          <div>
            <div class="card-department-name">${dept.name}</div>
          </div>
          <div class="card-department-icon">
            ${departmentIcons[dept.name] || ''}
          </div>
        </div>
        
        <div class="progress-section">
          <div class="progress-header">
            <span class="progress-label">KPI 完成率</span>
            <span class="progress-value">${completionRate}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${progressClass}" style="width: ${Math.min(completionRate, 100)}%"></div>
          </div>
          <div class="kpi-numbers">
            <span>目标: <strong>${dept.name === '销售部' || dept.name === '市场部' ? formatCurrency(dept.kpiTarget) : dept.kpiTarget}</strong></span>
            <span>当前: <strong>${dept.name === '销售部' || dept.name === '市场部' ? formatCurrency(dept.kpiCurrent) : dept.kpiCurrent}</strong></span>
          </div>
        </div>
        
        <div class="trend-section">
          <div class="trend-label">
            <span>近6个月趋势</span>
            <span class="trend-change ${isUp ? 'up' : 'down'}">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                ${isUp 
                  ? '<path d="M18 15l-6-6-6 6"/>' 
                  : '<path d="M6 9l6 6 6-6"/>'}
              </svg>
              ${Math.abs(trendChange).toFixed(1)}%
            </span>
          </div>
          <div class="sparkline-container">
            ${createSparkline(dept.trend, isUp)}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function sortEmployees(employees) {
  return [...employees].sort((a, b) => {
    let comparison = 0;
    switch (currentSort.field) {
      case 'rank':
      case 'sales':
        comparison = b.sales - a.sales;
        break;
      case 'name':
        comparison = a.name.localeCompare(b.name, 'zh-CN');
        break;
      case 'department':
        comparison = a.department.localeCompare(b.department, 'zh-CN');
        break;
      case 'completion':
        comparison = b.completionRate - a.completionRate;
        break;
      case 'rating':
        const ratingOrder = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
        comparison = ratingOrder[b.rating] - ratingOrder[a.rating];
        break;
      default:
        comparison = 0;
    }
    return currentSort.direction === 'asc' ? -comparison : comparison;
  });
}

function renderRankingTable() {
  const tbody = document.getElementById('ranking-body');
  const data = mockData[currentQuarter];
  const employees = sortEmployees(data.employees);
  
  const salesRanking = [...data.employees].sort((a, b) => b.sales - a.sales);
  const getRank = (empId) => salesRanking.findIndex(e => e.id === empId) + 1;
  
  tbody.innerHTML = employees.map((emp, index) => {
    const rank = getRank(emp.id);
    const rankClass = rank <= 3 ? `rank-${rank}` : 'rank-other';
    const progressClass = getCompletionClass(emp.completionRate);
    
    return `
      <tr>
        <td><span class="rank-badge ${rankClass}">${rank}</span></td>
        <td><span class="employee-name">${emp.name}</span></td>
        <td><span class="department-tag">${emp.department}</span></td>
        <td><span class="sales-value">${formatCurrency(emp.sales)}</span></td>
        <td class="completion-bar-cell">
          <div class="completion-bar-wrapper">
            <div class="completion-bar-small">
              <div class="completion-fill-small ${progressClass}" style="width: ${Math.min(emp.completionRate, 100)}%"></div>
            </div>
            <span class="completion-text">${emp.completionRate}%</span>
          </div>
        </td>
        <td><span class="rating-badge rating-${emp.rating}">${emp.rating}</span></td>
      </tr>
    `;
  }).join('');
  
  document.querySelectorAll('.ranking-table th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.dataset.sort === currentSort.field) {
      th.classList.add(currentSort.direction === 'asc' ? 'sorted-asc' : 'sorted-desc');
    }
  });
}

function renderPieChart() {
  const svg = document.getElementById('pie-chart');
  const legendContainer = document.getElementById('pie-legend');
  const totalElement = document.getElementById('total-employees');
  const data = mockData[currentQuarter];
  
  const distribution = {
    excellent: data.employees.filter(e => e.rating === 'S').length,
    good: data.employees.filter(e => e.rating === 'A').length,
    qualified: data.employees.filter(e => e.rating === 'B').length,
    improvement: data.employees.filter(e => e.rating === 'C').length
  };
  
  const total = data.employees.length;
  totalElement.textContent = total;
  
  const segments = [
    { label: '绩优 (S级)', value: distribution.excellent, color: '#f59e0b' },
    { label: '良好 (A级)', value: distribution.good, color: '#10b981' },
    { label: '达标 (B级)', value: distribution.qualified, color: '#3b82f6' },
    { label: '待改进 (C级)', value: distribution.improvement, color: '#ef4444' }
  ];
  
  const cx = 100;
  const cy = 100;
  const radius = 80;
  const innerRadius = 55;
  
  let currentAngle = 0;
  
  svg.innerHTML = segments.map(segment => {
    if (segment.value === 0) return '';
    
    const percentage = segment.value / total;
    const angle = percentage * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;
    
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    const x3 = cx + innerRadius * Math.cos(endAngle);
    const y3 = cy + innerRadius * Math.sin(endAngle);
    const x4 = cx + innerRadius * Math.cos(startAngle);
    const y4 = cy + innerRadius * Math.sin(startAngle);
    
    const largeArcFlag = angle > Math.PI ? 1 : 0;
    
    const pathData = `
      M ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      L ${x3} ${y3}
      A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}
      Z
    `;
    
    return `<path d="${pathData}" fill="${segment.color}" class="pie-segment" style="transition: opacity 0.3s"/>`;
  }).join('');
  
  legendContainer.innerHTML = segments.map(segment => {
    const percentage = ((segment.value / total) * 100).toFixed(0);
    return `
      <div class="legend-item">
        <div class="legend-color" style="background: ${segment.color}"></div>
        <div class="legend-info">
          <span class="legend-label">${segment.label}</span>
          <span>
            <span class="legend-value">${segment.value}</span>
            <span class="legend-percentage">(${percentage}%)</span>
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAll() {
  renderDepartmentCards();
  renderRankingTable();
  renderPieChart();
}

function initEventListeners() {
  const quarterSelect = document.getElementById('quarter-select');
  quarterSelect.addEventListener('change', (e) => {
    currentQuarter = e.target.value;
    renderAll();
  });
  
  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn.addEventListener('click', () => {
    refreshBtn.classList.add('spinning');
    setTimeout(() => {
      renderAll();
      refreshBtn.classList.remove('spinning');
    }, 600);
  });
  
  document.querySelectorAll('.ranking-table th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const field = th.dataset.sort;
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
      }
      renderRankingTable();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  initEventListeners();
});
