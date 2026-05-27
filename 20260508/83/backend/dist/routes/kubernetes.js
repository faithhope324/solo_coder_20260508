"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kubernetes_1 = require("../clients/kubernetes");
const router = (0, express_1.Router)();
router.get('/pods', async (req, res) => {
    try {
        const namespace = req.query.namespace || 'default';
        const pods = await kubernetes_1.k8sClient.getPods(namespace);
        res.json(pods);
    }
    catch (error) {
        res.status(500).json({ error: '获取 Pod 列表失败' });
    }
});
router.get('/pods/metrics', async (req, res) => {
    try {
        const namespace = req.query.namespace || 'default';
        const metrics = await kubernetes_1.k8sClient.getPodMetrics(namespace);
        res.json(metrics);
    }
    catch (error) {
        res.status(500).json({ error: '获取 Pod 指标失败' });
    }
});
router.get('/deployments', async (req, res) => {
    try {
        const namespace = req.query.namespace || 'default';
        const deployments = await kubernetes_1.k8sClient.getDeployments(namespace);
        res.json(deployments);
    }
    catch (error) {
        res.status(500).json({ error: '获取 Deployment 列表失败' });
    }
});
router.post('/deployments/scale', async (req, res) => {
    try {
        const { namespace, name, replicas } = req.body;
        if (!name || replicas === undefined) {
            return res.status(400).json({ error: '缺少必要参数: name, replicas' });
        }
        if (replicas < 0 || replicas > 100) {
            return res.status(400).json({ error: '副本数必须在 0-100 之间' });
        }
        const result = await kubernetes_1.k8sClient.scaleDeployment(namespace || 'default', name, replicas);
        if (result) {
            res.json(result);
        }
        else {
            res.status(404).json({ error: 'Deployment 未找到' });
        }
    }
    catch (error) {
        res.status(500).json({ error: '扩缩容操作失败' });
    }
});
router.get('/health', (req, res) => {
    res.json({
        connected: kubernetes_1.k8sClient.isKubernetesConnected(),
        mode: kubernetes_1.k8sClient.isKubernetesConnected() ? 'kubernetes' : 'mock',
    });
});
exports.default = router;
