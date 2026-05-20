const API_BASE = 'http://localhost:5000/api';
let currentUser = 'user_001';
let currentRecommendations = [];
let featureChart = null;
let allNewsData = new Map();

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadRecommendations();
    loadUserProfile();
});

function initEventListeners() {
    document.getElementById('userSelect').addEventListener('change', (e) => {
        currentUser = e.target.value;
        loadRecommendations();
        loadUserProfile();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadRecommendations();
        loadUserProfile();
    });

    document.getElementById('clearHistoryBtn').addEventListener('click', () => {
        if (confirm('确定要清除当前用户的所有行为记录吗？')) {
            clearUserHistory();
        }
    });

    document.getElementById('chartModal').addEventListener('click', (e) => {
        if (e.target.id === 'chartModal') {
            closeChartModal();
        }
    });

    document.getElementById('newsDetailModal').addEventListener('click', (e) => {
        if (e.target.id === 'newsDetailModal') {
            closeNewsDetailModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeChartModal();
            closeNewsDetailModal();
        }
    });
}

async function loadRecommendations() {
    const listEl = document.getElementById('recommendationsList');
    listEl.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>正在加载推荐内容...</p>
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/recommendations?user_id=${currentUser}&top_n=10`);
        const data = await response.json();

        if (data.success) {
            currentRecommendations = data.recommendations;
            renderRecommendations(data.recommendations);
        } else {
            listEl.innerHTML = '<p class="error">加载推荐失败</p>';
        }
    } catch (error) {
        listEl.innerHTML = '<p class="error">无法连接到服务器，请确保后端服务已启动</p>';
        console.error('Error loading recommendations:', error);
    }
}

function renderRecommendations(recommendations) {
    const listEl = document.getElementById('recommendationsList');
    const countEl = document.getElementById('recCount');

    countEl.textContent = `共 ${recommendations.length} 条推荐`;

    if (recommendations.length === 0) {
        listEl.innerHTML = '<p class="empty">暂无推荐内容</p>';
        return;
    }

    listEl.innerHTML = recommendations.map((news, index) => {
        allNewsData.set(news.id, news);
        return `
        <div class="news-card" data-news-id="${news.id}">
            <div class="news-rank">${index + 1}</div>
            <div class="news-content">
                <div class="news-header">
                    <span class="news-category category-${news.category}">${news.category}</span>
                    <span class="news-score">推荐分: ${(news.score * 100).toFixed(1)}%</span>
                </div>
                <h3 class="news-title news-title-link" onclick="showNewsDetail(${news.id})">${news.title}</h3>
                <p class="news-desc">${news.content}</p>
                <div class="news-reasons">
                    ${news.reasons.map(reason => `
                        <span class="reason-tag">💡 ${reason}</span>
                    `).join('')}
                </div>
                <div class="news-meta">
                    <span class="news-date">📅 ${news.publish_time}</span>
                    <span class="news-views">👁️ ${news.popularity} 热度</span>
                </div>
                <div class="news-actions">
                    <button class="action-btn btn-like" onclick="handleClick(${news.id})">
                        👍 感兴趣
                    </button>
                    <button class="action-btn btn-dislike" onclick="handleDislike(${news.id})">
                        👎 不感兴趣
                    </button>
                    <button class="action-btn btn-chart" onclick="showFeatureChart(${news.id})">
                        📊 查看特征贡献
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
}

async function loadUserProfile() {
    const profileEl = document.getElementById('userProfile');
    const statsEl = document.getElementById('userStats');

    try {
        const response = await fetch(`${API_BASE}/user/profile?user_id=${currentUser}`);
        const data = await response.json();

        if (data.success) {
            renderUserProfile(data.profile);
            renderUserStats(data.stats);
        }
    } catch (error) {
        console.error('Error loading user profile:', error);
        profileEl.innerHTML = '<p class="error">加载失败</p>';
        statsEl.innerHTML = '<p class="error">加载失败</p>';
    }
}

function renderUserProfile(profile) {
    const profileEl = document.getElementById('userProfile');

    if (Object.keys(profile.preferences).length === 0 && profile.click_history.length === 0) {
        profileEl.innerHTML = `
            <div class="empty-profile">
                <p>暂无用户偏好数据</p>
                <p class="hint">点击"感兴趣"开始记录您的偏好</p>
            </div>
        `;
        return;
    }

    let preferencesHtml = '';
    if (Object.keys(profile.preferences).length > 0) {
        const categories = Object.entries(profile.preferences)
            .sort((a, b) => b[1] - a[1]);
        preferencesHtml = `
            <div class="preference-list">
                ${categories.map(([cat, weight]) => `
                    <div class="preference-item">
                        <span class="pref-name">${cat}</span>
                        <div class="pref-bar">
                            <div class="pref-bar-fill" style="width: ${weight * 100}%"></div>
                        </div>
                        <span class="pref-value">${(weight * 100).toFixed(0)}%</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let historyHtml = '';
    if (profile.click_history.length > 0) {
        historyHtml = `
            <div class="click-history">
                <h4>最近点击</h4>
                <ul>
                    ${profile.click_history.slice(0, 8).map(item => {
                        allNewsData.set(item.id, item);
                        return `
                            <li class="click-history-item" onclick="showNewsDetail(${item.id})" title="点击查看详情">
                                <div class="news-title">${item.category}: ${item.title.length > 18 ? item.title.slice(0, 18) + '...' : item.title}</div>
                                <div class="news-time">${item.time ? formatTime(item.time) : '刚刚'}</div>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </div>
        `;
    } else if (Object.keys(profile.preferences).length === 0) {
        historyHtml = '<p class="history-empty">暂无点击记录</p>';
    }

    profileEl.innerHTML = preferencesHtml + historyHtml;
}

function formatTime(isoString) {
    try {
        const date = new Date(isoString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return '刚刚';
        if (minutes < 60) return `${minutes}分钟前`;
        if (hours < 24) return `${hours}小时前`;
        if (days < 7) return `${days}天前`;
        return date.toLocaleDateString('zh-CN');
    } catch {
        return '刚刚';
    }
}

function renderUserStats(stats) {
    const statsEl = document.getElementById('userStats');
    statsEl.innerHTML = `
        <div class="stats-grid">
            <div class="stat-item">
                <span class="stat-value">${stats.click_count}</span>
                <span class="stat-label">点击数</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.dislike_count}</span>
                <span class="stat-label">不感兴趣</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${stats.click_count + stats.dislike_count}</span>
                <span class="stat-label">总交互</span>
            </div>
        </div>
    `;
}

async function handleClick(newsId) {
    try {
        await fetch(`${API_BASE}/behavior`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser,
                news_id: newsId,
                action: 'click'
            })
        });

        const card = document.querySelector(`[data-news-id="${newsId}"]`);
        if (card) {
            card.style.animation = 'fadeOut 0.3s ease';
        }

        setTimeout(() => {
            loadRecommendations();
            loadUserProfile();
        }, 300);

        showToast('已记录您的兴趣，推荐将更精准！');
    } catch (error) {
        console.error('Error logging click:', error);
        showToast('记录失败，请重试', true);
    }
}

async function handleDislike(newsId) {
    try {
        const response = await fetch(`${API_BASE}/behavior`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser,
                news_id: newsId,
                action: 'dislike'
            })
        });
        const data = await response.json();

        if (data.success && data.new_recommendations) {
            currentRecommendations = data.new_recommendations;
            renderRecommendations(data.new_recommendations);
            loadUserProfile();
            showToast('已记录，将减少此类推荐');
        }
    } catch (error) {
        console.error('Error logging dislike:', error);
        showToast('记录失败，请重试', true);
    }
}

function showFeatureChart(newsId) {
    const news = currentRecommendations.find(n => n.id === newsId) || allNewsData.get(newsId);
    if (!news) return;

    const modal = document.getElementById('chartModal');
    const titleEl = document.getElementById('modalNewsTitle');
    const explanationEl = document.getElementById('featureExplanation');

    titleEl.textContent = news.title;

    const features = Object.entries(news.feature_contributions)
        .sort((a, b) => b[1] - a[1]);

    const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(236, 72, 153, 0.8)'
    ];

    const labels = features.map(f => f[0]);
    const values = features.map(f => (f[1] * 100).toFixed(1));

    explanationEl.innerHTML = `
        <h4>特征说明</h4>
        <ul>
            ${features.map(([name, weight]) => `
                <li><strong>${name}</strong>: 贡献度 ${(weight * 100).toFixed(1)}%</li>
            `).join('')}
        </ul>
        <p class="total-score">综合推荐得分: <strong>${(news.score * 100).toFixed(1)}%</strong></p>
    `;

    const ctx = document.getElementById('featureChart').getContext('2d');

    if (featureChart) {
        featureChart.destroy();
    }

    featureChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '特征贡献度 (%)',
                data: values,
                backgroundColor: colors.slice(0, features.length),
                borderColor: colors.slice(0, features.length).map(c => c.replace('0.8', '1')),
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: value => value + '%'
                    }
                }
            }
        }
    });

    modal.style.display = 'flex';
}

function closeChartModal() {
    const modal = document.getElementById('chartModal');
    modal.style.display = 'none';
    if (featureChart) {
        featureChart.destroy();
        featureChart = null;
    }
}

async function showNewsDetail(newsId) {
    const modal = document.getElementById('newsDetailModal');
    const contentEl = document.getElementById('newsDetailContent');

    let news = allNewsData.get(newsId);

    if (!news || !news.content) {
        try {
            const response = await fetch(`${API_BASE}/news/${newsId}`);
            const data = await response.json();
            if (data.success) {
                news = data.news;
                allNewsData.set(newsId, news);
            }
        } catch (error) {
            console.error('Error loading news detail:', error);
            contentEl.innerHTML = '<p class="error">加载新闻详情失败</p>';
            modal.style.display = 'flex';
            return;
        }
    }

    if (!news) {
        contentEl.innerHTML = '<p class="error">新闻不存在</p>';
        modal.style.display = 'flex';
        return;
    }

    contentEl.innerHTML = `
        <div class="news-detail">
            <span class="news-category category-${news.category}" style="display: inline-block; margin-bottom: 15px;">${news.category}</span>
            <h2 class="news-detail-title">${news.title}</h2>
            <div class="news-detail-meta">
                <span>📅 ${news.publish_time}</span>
                <span>👁️ ${news.popularity} 热度</span>
            </div>
            <div class="news-detail-content">
                <p>${news.content}</p>
                <p>这是一篇来自${news.category}类别的新闻报道。本文详细介绍了相关内容，为读者提供了全面的信息和深入的分析。</p>
                <p>新闻内容具有较高的可读性和参考价值，适合对该领域感兴趣的读者阅读。通过阅读本文，您可以了解到最新的行业动态和发展趋势。</p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
}

function closeNewsDetailModal() {
    const modal = document.getElementById('newsDetailModal');
    modal.style.display = 'none';
}

async function clearUserHistory() {
    try {
        const response = await fetch(`${API_BASE}/user/clear`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: currentUser
            })
        });
        const data = await response.json();

        if (data.success) {
            currentRecommendations = data.recommendations;
            renderRecommendations(data.recommendations);
            renderUserProfile(data.profile);
            renderUserStats(data.stats);
            showToast('用户记录已清除');
        }
    } catch (error) {
        console.error('Error clearing history:', error);
        showToast('清除失败，请重试', true);
    }
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'toast-error' : 'toast-success'}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-show');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('toast-show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
