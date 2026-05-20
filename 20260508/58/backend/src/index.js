const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { storage } = require('./storage');
const { alertEngine } = require('./alertEngine');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

app.post('/api/v1/traces', (req, res) => {
  const spans = Array.isArray(req.body) ? req.body : [req.body];
  const stored = storage.addSpans(spans);
  alertEngine.evaluateRules(storage);
  res.json({ success: true, count: stored });
});

app.get('/api/v1/topology', (req, res) => {
  const topology = storage.getTopology();
  res.json(topology);
});

app.get('/api/v1/services/:serviceName', (req, res) => {
  const { serviceName } = req.params;
  const details = storage.getServiceDetails(serviceName);
  if (!details) {
    return res.status(404).json({ error: 'Service not found' });
  }
  res.json(details);
});

app.get('/api/v1/services/:serviceName/error-traces', (req, res) => {
  const { serviceName } = req.params;
  const { limit = 10 } = req.query;
  const traces = storage.getErrorTraces(serviceName, parseInt(limit));
  res.json(traces);
});

app.get('/api/v1/alerts', (req, res) => {
  const alerts = storage.getAlerts();
  res.json(alerts);
});

app.get('/api/v1/alerts/rules', (req, res) => {
  const rules = storage.getAlertRules();
  res.json(rules);
});

app.post('/api/v1/alerts/rules', (req, res) => {
  const rule = req.body;
  const created = storage.addAlertRule(rule);
  res.json(created);
});

app.put('/api/v1/alerts/rules/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const updated = storage.updateAlertRule(id, updates);
  if (!updated) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  alertEngine.clearRuleCooldown(id);
  res.json(updated);
});

app.delete('/api/v1/alerts/rules/:id', (req, res) => {
  const { id } = req.params;
  const deleted = storage.deleteAlertRule(id);
  if (!deleted) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  res.json({ success: true });
});

app.get('/api/v1/health', (req, res) => {
  res.json({ status: 'healthy', spans: storage.getSpanCount() });
});

app.listen(PORT, () => {
  console.log(`Distributed Tracing Backend running on port ${PORT}`);
  alertEngine.start(storage);
});
