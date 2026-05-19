class AlertNotification {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.maxAlerts = options.maxAlerts || 5;
        this.autoDismiss = options.autoDismiss !== undefined ? options.autoDismiss : true;
        this.dismissDuration = options.dismissDuration || 5000;
        
        this.alerts = new Map();
        this.alertIdCounter = 0;
    }

    info(title, message, options = {}) {
        return this.show('info', title, message, options);
    }

    warning(title, message, options = {}) {
        return this.show('warning', title, message, options);
    }

    danger(title, message, options = {}) {
        return this.show('danger', title, message, options);
    }

    success(title, message, options = {}) {
        return this.show('info', title, message, options);
    }

    show(type, title, message, options = {}) {
        this.dismissAll();
        
        const id = ++this.alertIdCounter;
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert ${type}`;
        alertElement.dataset.alertId = id;
        
        const shouldDismiss = options.autoDismiss !== undefined ? options.autoDismiss : this.autoDismiss;
        
        alertElement.innerHTML = `
            <div class="alert-header">
                <span class="alert-title">${title}</span>
                <button class="alert-close" data-action="close">&times;</button>
            </div>
            <div class="alert-message">${message}</div>
        `;
        
        this.container.appendChild(alertElement);
        
        const alertData = {
            id,
            type,
            title,
            message,
            element: alertElement,
            timer: null
        };
        
        this.alerts.set(id, alertData);
        
        alertElement.querySelector('[data-action="close"]').addEventListener('click', () => {
            this.dismiss(id);
        });
        
        if (shouldDismiss) {
            const duration = options.dismissDuration || this.dismissDuration;
            alertData.timer = setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }
        
        return id;
    }

    dismiss(id) {
        const alert = this.alerts.get(id);
        if (!alert) return;
        
        if (alert.timer) {
            clearTimeout(alert.timer);
        }
        
        alert.element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        alert.element.style.opacity = '0';
        alert.element.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (alert.element.parentNode) {
                alert.element.parentNode.removeChild(alert.element);
            }
            this.alerts.delete(id);
        }, 300);
    }

    dismissAll() {
        this.alerts.forEach((alert, id) => {
            this.dismiss(id);
        });
    }

    enforceMaxAlerts() {
        if (this.alerts.size > this.maxAlerts) {
            const sortedIds = Array.from(this.alerts.keys()).sort((a, b) => a - b);
            const excess = sortedIds.slice(0, sortedIds.length - this.maxAlerts);
            excess.forEach(id => this.dismiss(id));
        }
    }

    getActiveAlerts() {
        return Array.from(this.alerts.values()).map(alert => ({
            id: alert.id,
            type: alert.type,
            title: alert.title,
            message: alert.message
        }));
    }

    destroy() {
        this.dismissAll();
        this.alerts.clear();
    }
}

window.AlertNotification = AlertNotification;
