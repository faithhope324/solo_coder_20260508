const axios = require('axios');

class AlertEngine {
  constructor() {
    this.lastAlertTimes = new Map();
    this.defaultCooldownMs = 60 * 1000;
    this.intervalId = null;
  }

  start(storage, intervalMs = 30000) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.intervalId = setInterval(() => {
      this.evaluateRules(storage);
    }, intervalMs);
    console.log('Alert engine started');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  clearRuleCooldown(ruleId) {
    for (const key of this.lastAlertTimes.keys()) {
      if (key.startsWith(`${ruleId}-`)) {
        this.lastAlertTimes.delete(key);
      }
    }
    console.log(`Cleared cooldown for rule ${ruleId}`);
  }

  evaluateRules(storage) {
    const rules = storage.getAlertRules().filter(r => r.enabled);
    const topology = storage.getTopology();

    for (const rule of rules) {
      const targets = rule.serviceName === '*' 
        ? topology.nodes.map(n => n.id)
        : [rule.serviceName];

      for (const serviceName of targets) {
        const details = storage.getServiceDetails(serviceName);
        if (!details) continue;

        const triggered = this.checkRule(rule, details);
        if (triggered) {
          const cooldownKey = `${rule.id}-${serviceName}`;
          const lastAlert = this.lastAlertTimes.get(cooldownKey) || 0;
          const cooldownMs = rule.cooldownMs || this.defaultCooldownMs;
          
          if (Date.now() - lastAlert > cooldownMs) {
            this.triggerAlert(rule, serviceName, details, storage);
            this.lastAlertTimes.set(cooldownKey, Date.now());
          }
        }
      }
    }
  }

  checkRule(rule, details) {
    const { condition, threshold } = rule;
    
    switch (condition) {
      case 'error_rate_gt':
        return details.errorRate > threshold;
      case 'error_rate_lt':
        return details.errorRate < threshold;
      case 'latency_p95_gt':
        return details.latency.p95 > threshold;
      case 'latency_p99_gt':
        return details.latency.p99 > threshold;
      case 'request_count_lt':
        return details.totalRequests < threshold;
      default:
        return false;
    }
  }

  async triggerAlert(rule, serviceName, details, storage) {
    const alert = {
      ruleId: rule.id,
      ruleName: rule.name,
      serviceName,
      condition: rule.condition,
      threshold: rule.threshold,
      currentValue: this.getCurrentValue(rule.condition, details),
      severity: rule.severity || 'warning',
      message: this.buildMessage(rule, serviceName, details)
    };

    storage.addAlert(alert);
    console.log(`ALERT: ${alert.message}`);

    if (rule.webhookUrl) {
      try {
        await axios.post(rule.webhookUrl, alert, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000
        });
        console.log(`Webhook sent to ${rule.webhookUrl}`);
      } catch (error) {
        console.error(`Failed to send webhook: ${error.message}`);
      }
    }
  }

  getCurrentValue(condition, details) {
    switch (condition) {
      case 'error_rate_gt':
      case 'error_rate_lt':
        return details.errorRate;
      case 'latency_p95_gt':
        return details.latency.p95;
      case 'latency_p99_gt':
        return details.latency.p99;
      case 'request_count_lt':
        return details.totalRequests;
      default:
        return 0;
    }
  }

  buildMessage(rule, serviceName, details) {
    const value = this.getCurrentValue(rule.condition, details);
    
    switch (rule.condition) {
      case 'error_rate_gt':
        return `Service ${serviceName} error rate ${value}% exceeds threshold ${rule.threshold}%`;
      case 'error_rate_lt':
        return `Service ${serviceName} error rate ${value}% is below threshold ${rule.threshold}%`;
      case 'latency_p95_gt':
        return `Service ${serviceName} P95 latency ${value}ms exceeds threshold ${rule.threshold}ms`;
      case 'latency_p99_gt':
        return `Service ${serviceName} P99 latency ${value}ms exceeds threshold ${rule.threshold}ms`;
      case 'request_count_lt':
        return `Service ${serviceName} request count ${value} is below threshold ${rule.threshold}`;
      default:
        return `Alert triggered for service ${serviceName}`;
    }
  }
}

const alertEngine = new AlertEngine();

module.exports = { alertEngine };
