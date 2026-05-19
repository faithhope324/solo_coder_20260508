class PoolMonitor {
    constructor(options = {}) {
        this.wsUrl = options.wsUrl || 'ws://localhost:8080/pool-monitor';
        this.warningThreshold = options.warningThreshold || 70;
        this.dangerThreshold = options.dangerThreshold || 80;
        
        this.gaugesContainer = document.getElementById('gauges-container');
        this.poolsContainer = document.getElementById('pools-container');
        this.wsStatusIndicator = document.getElementById('ws-status');
        this.wsStatusText = document.getElementById('ws-status-text');
        this.alertContainer = document.getElementById('alert-container');
        
        this.gauges = new Map();
        this.poolCards = new Map();
        this.previousStatus = new Map();
        this.notifiedPools = new Set();
        
        this.init();
    }

    init() {
        this.alert = new AlertNotification(this.alertContainer, {
            maxAlerts: 1,
            autoDismiss: true,
            dismissDuration: 5000
        });
        
        this.websocket = new WebSocketManager(this.wsUrl, {
            maxReconnectAttempts: 10,
            reconnectDelay: 2000,
            heartbeatInterval: 15000
        });
        
        this.websocket.on('open', () => this.handleWsOpen());
        this.websocket.on('close', () => this.handleWsClose());
        this.websocket.on('error', (error) => this.handleWsError(error));
        this.websocket.on('data', (data) => this.handleData(data));
        
        this.websocket.connect();
        
        this.startDemoMode();
    }

    handleWsOpen() {
        this.wsStatusIndicator.className = 'status-indicator connected';
        this.wsStatusText.textContent = 'WebSocket 已连接';
        this.alert.info('连接成功', '已连接到监控服务器');
    }

    handleWsClose() {
        this.wsStatusIndicator.className = 'status-indicator disconnected';
        this.wsStatusText.textContent = 'WebSocket 已断开';
        this.alert.warning('连接断开', '与监控服务器的连接已断开，正在尝试重连...');
    }

    handleWsError(error) {
        console.error('WebSocket error:', error);
        this.alert.danger('连接错误', 'WebSocket 连接出现错误');
    }

    handleData(data) {
        if (data.type === 'poolStatus') {
            this.updatePools(data.pools);
        } else if (data.type === 'releaseResult') {
            this.handleReleaseResult(data);
        }
    }

    updatePools(pools) {
        if (!pools || pools.length === 0) return;
        
        pools.forEach(pool => {
            const poolId = pool.id || pool.name;
            
            if (!this.gauges.has(poolId)) {
                this.createGauge(pool);
                this.createPoolCard(pool);
                this.previousStatus.set(poolId, 'normal');
            }
            
            this.updateGauge(pool);
            this.updatePoolCard(pool);
            this.checkStatusChange(pool);
        });
    }

    createGauge(pool) {
        const poolId = pool.id || pool.name;
        const gauge = new GaugeCard(this.gaugesContainer, {
            id: `gauge-${poolId}`,
            title: pool.name,
            subtitle: pool.type || '数据库连接池',
            value: pool.usageRate || 0,
            warningThreshold: this.warningThreshold,
            dangerThreshold: this.dangerThreshold,
            unit: '%',
            decimals: 1
        });
        this.gauges.set(poolId, gauge);
    }

    updateGauge(pool) {
        const poolId = pool.id || pool.name;
        const gauge = this.gauges.get(poolId);
        if (gauge) {
            gauge.update(pool.usageRate || 0);
        }
    }

    createPoolCard(pool) {
        const poolId = pool.id || pool.name;
        
        const card = document.createElement('div');
        card.className = 'pool-card';
        card.id = `pool-${poolId}`;
        
        card.innerHTML = `
            <div class="pool-header">
                <div class="pool-name">${pool.name}</div>
                <span class="pool-status-badge normal">正常</span>
            </div>
            <div class="pool-stats">
                <div class="stat-item">
                    <div class="stat-label">活跃连接数</div>
                    <div class="stat-value highlight">${pool.activeConnections || 0}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">总连接数</div>
                    <div class="stat-value">${pool.totalConnections || 0}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">空闲连接</div>
                    <div class="stat-value">${pool.idleConnections || 0}</div>
                </div>
                <div class="stat-item">
                    <div class="stat-label">等待队列</div>
                    <div class="stat-value">${pool.waitingQueue || 0}</div>
                </div>
            </div>
            <div class="progress-container">
                <div class="progress-label">
                    <span>使用率</span>
                    <span>${(pool.usageRate || 0).toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${pool.usageRate || 0}%"></div>
                </div>
            </div>
            <div class="pool-actions">
                <button class="btn btn-danger" data-action="release" data-pool="${poolId}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
                    </svg>
                    释放空闲连接
                </button>
            </div>
        `;
        
        card.querySelector('[data-action="release"]').addEventListener('click', (e) => {
            this.releaseConnections(poolId, pool.name);
        });
        
        this.poolsContainer.appendChild(card);
        this.poolCards.set(poolId, card);
    }

    updatePoolCard(pool) {
        const poolId = pool.id || pool.name;
        const card = this.poolCards.get(poolId);
        if (!card) return;
        
        const status = this.getStatus(pool.usageRate || 0);
        
        card.classList.remove('warning', 'danger');
        if (status === 'warning') card.classList.add('warning');
        if (status === 'danger') card.classList.add('danger');
        
        const statusBadge = card.querySelector('.pool-status-badge');
        statusBadge.className = `pool-status-badge ${status}`;
        statusBadge.textContent = this.getStatusText(status);
        
        const statValues = card.querySelectorAll('.stat-value');
        statValues[0].textContent = pool.activeConnections || 0;
        statValues[1].textContent = pool.totalConnections || 0;
        statValues[2].textContent = pool.idleConnections || 0;
        statValues[3].textContent = pool.waitingQueue || 0;
        
        statValues.forEach(el => el.classList.remove('warning', 'danger'));
        if (pool.waitingQueue > 0) {
            statValues[3].classList.add(pool.waitingQueue > 5 ? 'danger' : 'warning');
        }
        
        const progressLabel = card.querySelector('.progress-label span:last-child');
        progressLabel.textContent = `${(pool.usageRate || 0).toFixed(1)}%`;
        
        const progressFill = card.querySelector('.progress-fill');
        progressFill.style.width = `${pool.usageRate || 0}%`;
        progressFill.classList.remove('warning', 'danger');
        if (status === 'warning') progressFill.classList.add('warning');
        if (status === 'danger') progressFill.classList.add('danger');
    }

    checkStatusChange(pool) {
        const poolId = pool.id || pool.name;
        const currentStatus = this.getStatus(pool.usageRate || 0);
        const previousStatus = this.previousStatus.get(poolId);
        
        if (currentStatus !== previousStatus) {
            if (currentStatus === 'warning') {
                this.alert.warning('连接池警告', `${pool.name} 使用率达到 ${pool.usageRate.toFixed(1)}%`);
            } else if (currentStatus === 'danger') {
                this.alert.danger('连接池危险', `${pool.name} 使用率达到 ${pool.usageRate.toFixed(1)}%，请及时处理！`, {
                    autoDismiss: false
                });
            } else if (previousStatus === 'danger' || previousStatus === 'warning') {
                this.alert.success('连接池恢复', `${pool.name} 已恢复正常，当前使用率 ${pool.usageRate.toFixed(1)}%`);
            }
            
            this.previousStatus.set(poolId, currentStatus);
        }
        
        if (pool.waitingQueue > 5 && !this.notifiedPools.has(`${poolId}-queue`)) {
            this.alert.warning('等待队列过长', `${pool.name} 等待队列长度: ${pool.waitingQueue}`);
            this.notifiedPools.add(`${poolId}-queue`);
        } else if (pool.waitingQueue <= 5) {
            this.notifiedPools.delete(`${poolId}-queue`);
        }
    }

    releaseConnections(poolId, poolName) {
        const button = this.poolCards.get(poolId)?.querySelector('[data-action="release"]');
        if (button) {
            button.disabled = true;
            button.innerHTML = `
                <svg class="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                释放中...
            `;
        }
        
        const message = {
            type: 'releaseConnections',
            poolId: poolId,
            timestamp: Date.now()
        };
        
        if (this.websocket.isConnected()) {
            this.websocket.send(message);
        }
        
        setTimeout(() => {
            this.handleReleaseResult({ poolId, success: true, released: Math.floor(Math.random() * 10) + 1 });
        }, 1000);
    }

    handleReleaseResult(result) {
        const button = this.poolCards.get(result.poolId)?.querySelector('[data-action="release"]');
        if (button) {
            button.disabled = false;
            button.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/>
                </svg>
                释放空闲连接
            `;
        }
        
        if (result.success) {
            this.alert.success('释放成功', `已释放 ${result.released} 个空闲连接`);
        } else {
            this.alert.danger('释放失败', result.message || '释放连接时发生错误');
        }
    }

    getStatus(usageRate) {
        if (usageRate >= this.dangerThreshold) return 'danger';
        if (usageRate >= this.warningThreshold) return 'warning';
        return 'normal';
    }

    getStatusText(status) {
        const texts = {
            normal: '正常',
            warning: '警告',
            danger: '危险'
        };
        return texts[status] || status;
    }

    startDemoMode() {
        const demoPools = [
            { id: 'mysql-main', name: 'MySQL 主库', type: 'MySQL', usageRate: 45, activeConnections: 45, totalConnections: 100, idleConnections: 55, waitingQueue: 0 },
            { id: 'mysql-read', name: 'MySQL 从库', type: 'MySQL', usageRate: 72, activeConnections: 72, totalConnections: 100, idleConnections: 28, waitingQueue: 3 },
            { id: 'redis-cache', name: 'Redis 缓存', type: 'Redis', usageRate: 35, activeConnections: 35, totalConnections: 100, idleConnections: 65, waitingQueue: 0 },
            { id: 'postgresql', name: 'PostgreSQL 分析', type: 'PostgreSQL', usageRate: 88, activeConnections: 88, totalConnections: 100, idleConnections: 12, waitingQueue: 8 }
        ];
        
        this.updatePools(demoPools);
        
        setInterval(() => {
            demoPools.forEach(pool => {
                const change = (Math.random() - 0.5) * 10;
                pool.usageRate = Math.max(5, Math.min(98, pool.usageRate + change));
                pool.activeConnections = Math.round(pool.usageRate);
                pool.idleConnections = pool.totalConnections - pool.activeConnections;
                pool.waitingQueue = Math.max(0, pool.waitingQueue + Math.floor(Math.random() * 5) - 2);
            });
            this.updatePools(demoPools);
        }, 3000);
    }

    destroy() {
        this.websocket.close();
        this.alert.destroy();
        this.gauges.forEach(gauge => gauge.destroy());
        this.poolCards.forEach(card => card.remove());
        this.gauges.clear();
        this.poolCards.clear();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.poolMonitor = new PoolMonitor({
        warningThreshold: 70,
        dangerThreshold: 80
    });
});
