const { v4: uuidv4 } = require('uuid');

const WINDOW_MS = 5 * 60 * 1000;

function getServiceName(span) {
  return span.serviceName || (span.resource && span.resource.service) || 'unknown';
}

function isErrorSpan(span) {
  return span.status === 'ERROR' || (span.tags && span.tags.error === true);
}

class Storage {
  constructor() {
    this.spans = [];
    this.alertRules = [];
    this.alerts = [];
    this.maxSpans = 100000;
  }

  addSpans(spans) {
    const now = Date.now();
    const processedSpans = spans.map(span => ({
      ...span,
      receivedAt: now,
      id: span.spanId || uuidv4()
    }));
    
    this.spans.push(...processedSpans);
    
    if (this.spans.length > this.maxSpans) {
      this.spans = this.spans.slice(-this.maxSpans);
    }
    
    return processedSpans.length;
  }

  getSpanCount() {
    return this.spans.length;
  }

  getTopology() {
    const services = new Map();
    const edges = new Map();
    
    const now = Date.now();
    const recentSpans = this.spans.filter(s => now - s.receivedAt < WINDOW_MS);

    for (const span of recentSpans) {
      const serviceName = getServiceName(span);
      
      if (!services.has(serviceName)) {
        services.set(serviceName, {
          name: serviceName,
          callCount: 0,
          errorCount: 0,
          avgLatency: 0,
          totalLatency: 0
        });
      }
      
      const service = services.get(serviceName);
      service.callCount++;
      
      if (isErrorSpan(span)) {
        service.errorCount++;
      }
      
      if (span.duration) {
        service.totalLatency += span.duration;
        service.avgLatency = service.totalLatency / service.callCount;
      }

      if (span.parentServiceName || (span.tags && span.tags.parentService)) {
        const parentService = span.parentServiceName || span.tags.parentService;
        const edgeKey = `${parentService}->${serviceName}`;
        
        if (!edges.has(edgeKey)) {
          edges.set(edgeKey, {
            source: parentService,
            target: serviceName,
            count: 0
          });
        }
        edges.get(edgeKey).count++;
      }
    }

    return {
      nodes: Array.from(services.values()).map(s => ({
        id: s.name,
        label: s.name,
        callCount: s.callCount,
        errorRate: s.callCount > 0 ? (s.errorCount / s.callCount * 100).toFixed(2) : 0,
        avgLatency: Math.round(s.avgLatency)
      })),
      edges: Array.from(edges.values())
    };
  }

  getServiceDetails(serviceName) {
    const now = Date.now();
    
    const serviceSpans = this.spans.filter(s => 
      getServiceName(s) === serviceName &&
      now - s.receivedAt < WINDOW_MS
    );

    if (serviceSpans.length === 0) {
      return null;
    }

    const totalRequests = serviceSpans.length;
    const errorSpans = serviceSpans.filter(s => isErrorSpan(s));
    const errorRate = (errorSpans.length / totalRequests * 100).toFixed(2);

    const latencies = serviceSpans
      .map(s => s.duration || 0)
      .sort((a, b) => a - b);

    const percentile = (p) => {
      if (latencies.length === 0) return 0;
      const index = Math.ceil((p / 100) * latencies.length) - 1;
      return latencies[Math.max(0, Math.min(index, latencies.length - 1))];
    };

    return {
      serviceName,
      totalRequests,
      errorCount: errorSpans.length,
      errorRate: parseFloat(errorRate),
      latency: {
        p50: percentile(50),
        p90: percentile(90),
        p95: percentile(95),
        p99: percentile(99),
        avg: latencies.reduce((a, b) => a + b, 0) / latencies.length
      }
    };
  }

  getErrorTraces(serviceName, limit = 10) {
    const now = Date.now();
    const errorSpans = this.spans.filter(s => 
      getServiceName(s) === serviceName &&
      isErrorSpan(s) &&
      now - s.receivedAt < WINDOW_MS
    );

    return errorSpans
      .sort((a, b) => b.receivedAt - a.receivedAt)
      .slice(0, limit)
      .map(span => ({
        traceId: span.traceId,
        spanId: span.spanId,
        operationName: span.name || span.operationName,
        duration: span.duration,
        startTime: span.startTime || span.receivedAt,
        error: span.tags?.errorMessage || span.statusMessage || 'Unknown error',
        tags: span.tags || {}
      }));
  }

  addAlertRule(rule) {
    const newRule = {
      ...rule,
      id: uuidv4(),
      createdAt: Date.now(),
      enabled: rule.enabled !== false,
      cooldownMs: rule.cooldownMs || 60000
    };
    this.alertRules.push(newRule);
    return newRule;
  }

  getAlertRules() {
    return this.alertRules;
  }

  updateAlertRule(id, updates) {
    const index = this.alertRules.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.alertRules[index] = { ...this.alertRules[index], ...updates };
    return this.alertRules[index];
  }

  deleteAlertRule(id) {
    const index = this.alertRules.findIndex(r => r.id === id);
    if (index === -1) return null;
    this.alertRules.splice(index, 1);
    return true;
  }

  addAlert(alert) {
    const newAlert = {
      ...alert,
      id: uuidv4(),
      createdAt: Date.now()
    };
    this.alerts.unshift(newAlert);
    if (this.alerts.length > 1000) {
      this.alerts = this.alerts.slice(0, 1000);
    }
    return newAlert;
  }

  getAlerts() {
    return this.alerts;
  }
}

const storage = new Storage();

module.exports = { storage };
