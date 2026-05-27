"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const docker_1 = require("../clients/docker");
const router = (0, express_1.Router)();
router.get('/containers', async (req, res) => {
    try {
        const containers = await docker_1.dockerClient.getContainers();
        res.json(containers);
    }
    catch (error) {
        res.status(500).json({ error: '获取容器列表失败' });
    }
});
router.get('/containers/stats', async (req, res) => {
    try {
        const stats = await docker_1.dockerClient.getContainerStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: '获取容器统计失败' });
    }
});
router.get('/health', (req, res) => {
    res.json({
        connected: docker_1.dockerClient.isDockerConnected(),
        mode: docker_1.dockerClient.isDockerConnected() ? 'docker' : 'mock',
    });
});
exports.default = router;
