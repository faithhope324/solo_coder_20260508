const API_BASE = 'http://localhost:5000/api';

let currentPage = 1;
let perPage = 20;
let currentFilter = 'all';
let searchQuery = '';
let selectedPlayers = new Set();
let currentPlayerData = null;
let radarChart = null;

const riskLabels = {
    high: '高风险',
    medium: '中风险',
    low: '低风险'
};

const typeLabels = {
    push: '消息推送',
    coupon: '优惠券',
    event: '活动邀请',
    guide: '新手引导',
    social: '社交活动',
    vip: 'VIP服务'
};

async function fetchStatistics() {
    try {
        const response = await fetch(`${API_BASE}/statistics`);
        const data = await response.json();
        
        document.getElementById('totalPlayers').textContent = data.total_players;
        document.getElementById('highRiskCount').textContent = data.high_risk_count;
        document.getElementById('highRiskPercent').textContent = `${data.high_risk_percentage}%`;
        document.getElementById('mediumRiskCount').textContent = data.medium_risk_count;
        document.getElementById('mediumRiskPercent').textContent = `${data.medium_risk_percentage}%`;
        document.getElementById('lowRiskCount').textContent = data.low_risk_count;
        document.getElementById('lowRiskPercent').textContent = `${data.low_risk_percentage}%`;
    } catch (error) {
        console.error('获取统计数据失败:', error);
    }
}

async function fetchPlayers() {
    try {
        const params = new URLSearchParams({
            page: currentPage,
            per_page: perPage,
            risk_level: currentFilter,
            search: searchQuery
        });
        
        const response = await fetch(`${API_BASE}/players?${params}`);
        const data = await response.json();
        
        renderPlayerTable(data.players);
        renderPagination(data.page, data.total_pages, data.total);
        updateSelectAllState();
    } catch (error) {
        console.error('获取玩家列表失败:', error);
        showToast('获取玩家列表失败', 'error');
    }
}

function renderPlayerTable(players) {
    const tbody = document.getElementById('playerTableBody');
    tbody.innerHTML = '';
    
    players.forEach(player => {
        const row = document.createElement('tr');
        const riskLevel = player.risk_level;
        const probPercent = (player.churn_probability * 100).toFixed(1);
        
        row.className = selectedPlayers.has(player.player_id) ? 'selected' : '';
        row.dataset.playerId = player.player_id;
        
        row.innerHTML = `
            <td>
                <input type="checkbox" class="player-checkbox" 
                       data-player-id="${player.player_id}"
                       ${selectedPlayers.has(player.player_id) ? 'checked' : ''}>
            </td>
            <td>${player.player_id}</td>
            <td>${player.name}</td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="probability-bar">
                        <div class="probability-fill ${riskLevel}" 
                             style="width: ${probPercent}%"></div>
                    </div>
                    <span>${probPercent}%</span>
                </div>
            </td>
            <td><span class="risk-badge ${riskLevel}">${riskLabels[riskLevel]}</span></td>
            <td>${player.login_freq_7d} 次</td>
            <td>¥${player.recharge_amount.toFixed(2)}</td>
            <td>${player.level_progress}%</td>
            <td>${player.days_since_last_login} 天</td>
            <td>
                <button class="btn-primary view-detail-btn" 
                        data-player-id="${player.player_id}"
                        style="padding: 4px 12px; font-size: 12px;">
                    查看
                </button>
            </td>
        `;
        
        row.addEventListener('click', (e) => {
            if (!e.target.classList.contains('player-checkbox') && 
                !e.target.classList.contains('view-detail-btn')) {
                viewPlayerDetail(player.player_id);
            }
        });
        
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.player-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const playerId = e.target.dataset.playerId;
            if (e.target.checked) {
                selectedPlayers.add(playerId);
            } else {
                selectedPlayers.delete(playerId);
            }
            updateSelectedCount();
            updateSelectAllState();
        });
    });
    
    document.querySelectorAll('.view-detail-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            viewPlayerDetail(btn.dataset.playerId);
        });
    });
}

function renderPagination(page, totalPages, total) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '上一页';
    prevBtn.disabled = page <= 1;
    prevBtn.addEventListener('click', () => {
        currentPage--;
        fetchPlayers();
    });
    pagination.appendChild(prevBtn);
    
    const startPage = Math.max(1, page - 2);
    const endPage = Math.min(totalPages, page + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === page ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            fetchPlayers();
        });
        pagination.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = '下一页';
    nextBtn.disabled = page >= totalPages;
    nextBtn.addEventListener('click', () => {
        currentPage++;
        fetchPlayers();
    });
    pagination.appendChild(nextBtn);
}

async function viewPlayerDetail(playerId) {
    try {
        const response = await fetch(`${API_BASE}/players/${playerId}`);
        const data = await response.json();
        
        currentPlayerData = data;
        
        document.getElementById('detailPlaceholder').style.display = 'none';
        document.getElementById('detailContent').style.display = 'block';
        
        document.getElementById('detailName').textContent = data.name;
        document.getElementById('detailPlayerId').textContent = data.player_id;
        
        const riskBadge = document.getElementById('detailRiskBadge');
        riskBadge.className = `risk-badge ${data.risk_level}`;
        riskBadge.textContent = riskLabels[data.risk_level];
        
        const probPercent = (data.churn_probability * 100).toFixed(1);
        document.getElementById('probabilityValue').textContent = `${probPercent}%`;
        
        const circle = document.getElementById('progressCircle');
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (data.churn_probability * circumference);
        circle.style.strokeDashoffset = offset;
        
        const probColor = data.risk_level === 'high' ? '#e74c3c' : 
                          data.risk_level === 'medium' ? '#f39c12' : '#27ae60';
        circle.style.stroke = probColor;
        
        renderRadarChart(data.radar_data);
        renderFeatures(data.features);
        renderRecommendations(data.recommendations);
        
    } catch (error) {
        console.error('获取玩家详情失败:', error);
        showToast('获取玩家详情失败', 'error');
    }
}

function renderRadarChart(radarData) {
    const ctx = document.getElementById('radarChart').getContext('2d');
    
    if (radarChart) {
        radarChart.destroy();
    }
    
    const labels = radarData.map(d => d.feature);
    const data = radarData.map(d => d.normalized);
    
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '玩家特征',
                data: data,
                backgroundColor: 'rgba(102, 126, 234, 0.2)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        font: {
                            size: 10
                        }
                    },
                    pointLabels: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

function renderFeatures(features) {
    const grid = document.getElementById('featuresGrid');
    grid.innerHTML = '';
    
    const featureOrder = [
        'login_freq_7d',
        'total_playtime_hours',
        'recharge_amount',
        'level_progress',
        'days_since_last_login',
        'task_completion_rate',
        'social_connections',
        'purchase_count'
    ];
    
    featureOrder.forEach(key => {
        const feature = features[key];
        if (feature) {
            const item = document.createElement('div');
            item.className = 'feature-item';
            
            let displayValue = feature.value;
            if (key === 'recharge_amount') {
                displayValue = `¥${feature.value.toFixed(2)}`;
            } else if (key === 'total_playtime_hours') {
                displayValue = `${feature.value.toFixed(1)} 小时`;
            } else if (key.includes('progress') || key.includes('rate')) {
                displayValue = `${feature.value}%`;
            } else if (key.includes('days')) {
                displayValue = `${feature.value} 天`;
            } else {
                displayValue = `${feature.value} 次`;
            }
            
            item.innerHTML = `
                <div class="feature-label">${feature.name}</div>
                <div class="feature-value">${displayValue}</div>
            `;
            grid.appendChild(item);
        }
    });
}

function renderRecommendations(recommendations) {
    const list = document.getElementById('recommendationsList');
    list.innerHTML = '';
    
    if (recommendations.length === 0) {
        list.innerHTML = '<p style="color: #7f8c8d; text-align: center; padding: 20px;">暂无建议</p>';
        return;
    }
    
    recommendations.forEach(rec => {
        const item = document.createElement('div');
        item.className = `recommendation-item ${rec.priority === 'high' ? 'high-priority' : ''}`;
        
        item.innerHTML = `
            <div class="rec-type">${typeLabels[rec.type] || rec.type}</div>
            <div class="rec-title">${rec.title}</div>
            <div class="rec-content">${rec.content}</div>
        `;
        list.appendChild(item);
    });
}

function updateSelectedCount() {
    document.getElementById('selectedCount').textContent = selectedPlayers.size;
    document.getElementById('batchInterveneBtn').disabled = selectedPlayers.size === 0;
}

function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.player-checkbox');
    const selectAll = document.getElementById('selectAll');
    
    if (checkboxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        return;
    }
    
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    
    if (checkedCount === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (checkedCount === checkboxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    }
}

function selectAllPlayers(checked) {
    const checkboxes = document.querySelectorAll('.player-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
        const playerId = cb.dataset.playerId;
        if (checked) {
            selectedPlayers.add(playerId);
        } else {
            selectedPlayers.delete(playerId);
        }
    });
    updateSelectedCount();
}

function openInterveneModal() {
    document.getElementById('modalPlayerCount').textContent = selectedPlayers.size;
    document.getElementById('interveneModal').style.display = 'flex';
    
    const preview = document.getElementById('selectedPreview');
    preview.innerHTML = '';
    
    selectedPlayers.forEach(pid => {
        const row = document.querySelector(`tr[data-player-id="${pid}"]`);
        if (row) {
            const cells = row.querySelectorAll('td');
            const name = cells[2].textContent;
            const item = document.createElement('div');
            item.className = 'selected-preview-item';
            item.textContent = `${pid} - ${name}`;
            preview.appendChild(item);
        }
    });
}

function closeInterveneModal() {
    document.getElementById('interveneModal').style.display = 'none';
}

async function executeIntervention() {
    const type = document.querySelector('input[name="interventionType"]:checked').value;
    
    try {
        const response = await fetch(`${API_BASE}/intervene`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                player_ids: Array.from(selectedPlayers),
                type: type
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`干预成功！成功 ${data.success_count} 人，失败 ${data.failed_count} 人`, 'success');
            selectedPlayers.clear();
            updateSelectedCount();
            fetchPlayers();
        } else {
            showToast('干预执行失败', 'error');
        }
    } catch (error) {
        console.error('干预执行失败:', error);
        showToast('干预执行失败', 'error');
    }
    
    closeInterveneModal();
}

async function executeSingleIntervention() {
    if (!currentPlayerData) return;
    
    const interventionType = document.querySelector('input[name="singleInterventionType"]:checked')?.value || 'auto';
    
    try {
        const response = await fetch(`${API_BASE}/intervene`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                player_ids: [currentPlayerData.player_id],
                type: interventionType
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            const typeLabels = {
                auto: '智能匹配',
                push: '消息推送',
                coupon: '优惠券',
                event: '活动邀请',
                guide: '新手引导'
            };
            showToast(`干预执行成功！已发送${typeLabels[interventionType] || ''}`, 'success');
            viewPlayerDetail(currentPlayerData.player_id);
        } else {
            showToast('干预执行失败', 'error');
        }
    } catch (error) {
        console.error('干预执行失败:', error);
        showToast('干预执行失败', 'error');
    }
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

function initEventListeners() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            currentPage = 1;
            selectedPlayers.clear();
            updateSelectedCount();
            fetchPlayers();
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    const searchClear = document.getElementById('searchClear');
    
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        currentPage = 1;
        searchClear.style.display = searchQuery ? 'block' : 'none';
        fetchPlayers();
    });
    
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        searchClear.style.display = 'none';
        currentPage = 1;
        fetchPlayers();
    });
    
    document.getElementById('selectAll').addEventListener('change', (e) => {
        selectAllPlayers(e.target.checked);
    });
    
    document.getElementById('batchInterveneBtn').addEventListener('click', openInterveneModal);
    document.getElementById('closeModal').addEventListener('click', closeInterveneModal);
    document.getElementById('cancelIntervene').addEventListener('click', closeInterveneModal);
    document.getElementById('confirmIntervene').addEventListener('click', executeIntervention);
    
    document.getElementById('singleInterveneBtn').addEventListener('click', executeSingleIntervention);
    
    document.getElementById('interveneModal').addEventListener('click', (e) => {
        if (e.target.id === 'interveneModal') {
            closeInterveneModal();
        }
    });
}

async function init() {
    initEventListeners();
    await fetchStatistics();
    await fetchPlayers();
    
    try {
        await fetch(`${API_BASE}/health`);
        console.log('后端服务连接成功');
    } catch (error) {
        console.warn('无法连接到后端服务，请确保后端已启动');
        showToast('无法连接到后端服务，请确保后端已启动', 'error');
    }
}

document.addEventListener('DOMContentLoaded', init);
