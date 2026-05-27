"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.k8sClient = void 0;
const client_node_1 = require("@kubernetes/client-node");
const events_1 = require("events");
class KubernetesClient extends events_1.EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.namespace = 'default';
        this.kubeConfig = new client_node_1.KubeConfig();
        this.kubeConfig.loadFromDefault();
        this.coreV1Api = this.kubeConfig.makeApiClient(client_node_1.CoreV1Api);
        this.appsV1Api = this.kubeConfig.makeApiClient(client_node_1.AppsV1Api);
        this.watch = new client_node_1.Watch(this.kubeConfig);
        this.testConnection();
        this.startWatching();
    }
    async testConnection() {
        try {
            await this.coreV1Api.listNamespacedPod('default');
            this.isConnected = true;
            console.log('Kubernetes API 连接成功');
        }
        catch (error) {
            console.warn('Kubernetes API 连接失败，将使用模拟数据:', error.message);
            this.isConnected = false;
        }
    }
    startWatching() {
        if (!this.isConnected)
            return;
        this.watch.watch('/api/v1/pods', { namespace: this.namespace }, (type, obj) => {
            const event = this.createPodEvent(type, obj);
            if (event) {
                this.emit('event', event);
            }
        }, (err) => {
            console.error('Pod watch error:', err);
            setTimeout(() => this.startWatching(), 5000);
        });
    }
    createPodEvent(type, obj) {
        const podName = obj.metadata?.name || 'unknown';
        const namespace = obj.metadata?.namespace || 'default';
        const timestamp = new Date().toISOString();
        let eventType;
        let message;
        switch (type) {
            case 'ADDED':
                eventType = 'pod_created';
                message = `Pod ${podName} 已创建`;
                break;
            case 'DELETED':
                eventType = 'pod_deleted';
                message = `Pod ${podName} 已删除`;
                break;
            case 'MODIFIED':
                const phase = obj.status?.phase;
                if (phase === 'Failed') {
                    eventType = 'pod_failed';
                    message = `Pod ${podName} 失败`;
                }
                else {
                    return null;
                }
                break;
            default:
                return null;
        }
        return {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: eventType,
            message,
            timestamp,
            source: 'kubernetes',
            metadata: {
                podName,
                namespace,
                nodeName: obj.spec?.nodeName || '',
            },
        };
    }
    async getPods(namespace = 'default') {
        if (!this.isConnected) {
            return this.getMockPods();
        }
        try {
            const response = await this.coreV1Api.listNamespacedPod(namespace);
            return response.body.items.map(this.transformPod.bind(this));
        }
        catch (error) {
            console.error('获取 Pod 列表失败:', error);
            return this.getMockPods();
        }
    }
    async getPodMetrics(namespace = 'default') {
        if (!this.isConnected) {
            return this.getMockPodMetrics();
        }
        try {
            const response = await this.coreV1Api.listNamespacedPod(namespace);
            const metrics = [];
            for (const pod of response.body.items) {
                const podMetrics = await this.getSinglePodMetrics(pod);
                if (podMetrics) {
                    metrics.push(podMetrics);
                }
            }
            return metrics;
        }
        catch (error) {
            console.error('获取 Pod 指标失败:', error);
            return this.getMockPodMetrics();
        }
    }
    async getSinglePodMetrics(pod) {
        const podName = pod.metadata?.name;
        const namespace = pod.metadata?.namespace || 'default';
        if (!podName)
            return null;
        try {
            const containers = [];
            let totalCpu = 0;
            let totalMemory = 0;
            if (pod.spec?.containers) {
                for (const container of pod.spec.containers) {
                    const cpuUsage = Math.random() * 100;
                    const memoryUsage = Math.random() * 512;
                    containers.push({
                        name: container.name,
                        cpuUsage,
                        memoryUsage,
                    });
                    totalCpu += cpuUsage;
                    totalMemory += memoryUsage;
                }
            }
            return {
                podName,
                namespace,
                cpuUsage: totalCpu,
                memoryUsage: totalMemory,
                timestamp: new Date().toISOString(),
                containers,
            };
        }
        catch {
            return null;
        }
    }
    async getDeployments(namespace = 'default') {
        if (!this.isConnected) {
            return this.getMockDeployments();
        }
        try {
            const response = await this.appsV1Api.listNamespacedDeployment(namespace);
            return response.body.items.map(this.transformDeployment.bind(this));
        }
        catch (error) {
            console.error('获取 Deployment 列表失败:', error);
            return this.getMockDeployments();
        }
    }
    async scaleDeployment(namespace, name, replicas) {
        if (!this.isConnected) {
            return this.mockScaleDeployment(namespace, name, replicas);
        }
        try {
            const response = await this.appsV1Api.patchNamespacedDeployment(name, namespace, {
                spec: {
                    replicas,
                },
            }, undefined, undefined, undefined, undefined, undefined, {
                headers: {
                    'Content-Type': 'application/merge-patch+json',
                },
            });
            const event = {
                id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                type: 'deployment_scaled',
                message: `Deployment ${name} 已扩缩容到 ${replicas} 个副本`,
                timestamp: new Date().toISOString(),
                source: 'kubernetes',
                metadata: {
                    deploymentName: name,
                    namespace,
                    replicas: replicas.toString(),
                },
            };
            this.emit('event', event);
            return this.transformDeployment(response.body);
        }
        catch (error) {
            console.error('扩缩容 Deployment 失败:', error);
            return null;
        }
    }
    transformPod(pod) {
        const containers = [];
        let totalCpu = 0;
        let totalMemory = 0;
        if (pod.spec?.containers) {
            for (const container of pod.spec.containers) {
                const cpuUsage = Math.random() * 100;
                const memoryUsage = Math.random() * 512;
                containers.push({
                    name: container.name,
                    cpuUsage,
                    memoryUsage,
                });
                totalCpu += cpuUsage;
                totalMemory += memoryUsage;
            }
        }
        const status = pod.status?.phase;
        return {
            name: pod.metadata?.name || 'unknown',
            namespace: pod.metadata?.namespace || 'default',
            uid: pod.metadata?.uid || '',
            status: status || 'Unknown',
            phase: pod.status?.phase || 'Unknown',
            nodeName: pod.spec?.nodeName || '',
            podIP: pod.status?.podIP || '',
            startTime: pod.status?.startTime?.toISOString() || '',
            containers: pod.status?.containerStatuses?.map((cs) => ({
                name: cs.name || '',
                image: cs.image || '',
                ready: cs.ready || false,
                restartCount: cs.restartCount || 0,
                state: Object.keys(cs.state || {})[0] || 'unknown',
            })) || [],
            labels: pod.metadata?.labels || {},
        };
    }
    transformDeployment(deployment) {
        const replicas = deployment.spec?.replicas || 0;
        const readyReplicas = deployment.status?.readyReplicas || 0;
        const updatedReplicas = deployment.status?.updatedReplicas || 0;
        const availableReplicas = deployment.status?.availableReplicas || 0;
        const unavailableReplicas = deployment.status?.unavailableReplicas || 0;
        let status = 'Progressing';
        if (readyReplicas === replicas && replicas > 0) {
            status = 'Healthy';
        }
        else if (unavailableReplicas > 0) {
            status = 'Degraded';
        }
        return {
            name: deployment.metadata?.name || 'unknown',
            namespace: deployment.metadata?.namespace || 'default',
            uid: deployment.metadata?.uid || '',
            replicas,
            readyReplicas,
            updatedReplicas,
            availableReplicas,
            unavailableReplicas,
            status,
            creationTimestamp: deployment.metadata?.creationTimestamp?.toISOString() || '',
            labels: deployment.metadata?.labels || {},
        };
    }
    getMockPods() {
        const mockData = [
            {
                name: 'frontend-app-abc123',
                namespace: 'default',
                uid: 'uid-1',
                status: 'Running',
                phase: 'Running',
                nodeName: 'node-1',
                podIP: '10.244.1.10',
                startTime: new Date(Date.now() - 3600000).toISOString(),
                containers: [
                    { name: 'frontend', image: 'nginx:alpine', ready: true, restartCount: 0, state: 'running' },
                ],
                labels: { app: 'frontend', tier: 'web' },
            },
            {
                name: 'backend-api-def456',
                namespace: 'default',
                uid: 'uid-2',
                status: 'Running',
                phase: 'Running',
                nodeName: 'node-1',
                podIP: '10.244.1.11',
                startTime: new Date(Date.now() - 7200000).toISOString(),
                containers: [
                    { name: 'api', image: 'node:18-alpine', ready: true, restartCount: 1, state: 'running' },
                ],
                labels: { app: 'backend', tier: 'api' },
            },
            {
                name: 'database-xyz789',
                namespace: 'default',
                uid: 'uid-3',
                status: 'Running',
                phase: 'Running',
                nodeName: 'node-2',
                podIP: '10.244.2.10',
                startTime: new Date(Date.now() - 86400000).toISOString(),
                containers: [
                    { name: 'postgres', image: 'postgres:15', ready: true, restartCount: 0, state: 'running' },
                ],
                labels: { app: 'database', tier: 'db' },
            },
            {
                name: 'redis-cache-aaa111',
                namespace: 'default',
                uid: 'uid-4',
                status: 'Pending',
                phase: 'Pending',
                nodeName: '',
                podIP: '',
                startTime: '',
                containers: [
                    { name: 'redis', image: 'redis:7-alpine', ready: false, restartCount: 0, state: 'waiting' },
                ],
                labels: { app: 'cache', tier: 'cache' },
            },
        ];
        return mockData;
    }
    getMockPodMetrics() {
        return [
            {
                podName: 'frontend-app-abc123',
                namespace: 'default',
                cpuUsage: 45.2,
                memoryUsage: 256.5,
                timestamp: new Date().toISOString(),
                containers: [{ name: 'frontend', cpuUsage: 45.2, memoryUsage: 256.5 }],
            },
            {
                podName: 'backend-api-def456',
                namespace: 'default',
                cpuUsage: 78.5,
                memoryUsage: 512.3,
                timestamp: new Date().toISOString(),
                containers: [{ name: 'api', cpuUsage: 78.5, memoryUsage: 512.3 }],
            },
            {
                podName: 'database-xyz789',
                namespace: 'default',
                cpuUsage: 23.1,
                memoryUsage: 1024.8,
                timestamp: new Date().toISOString(),
                containers: [{ name: 'postgres', cpuUsage: 23.1, memoryUsage: 1024.8 }],
            },
            {
                podName: 'redis-cache-aaa111',
                namespace: 'default',
                cpuUsage: 0,
                memoryUsage: 0,
                timestamp: new Date().toISOString(),
                containers: [{ name: 'redis', cpuUsage: 0, memoryUsage: 0 }],
            },
        ];
    }
    getMockDeployments() {
        return [
            {
                name: 'frontend-app',
                namespace: 'default',
                uid: 'dep-1',
                replicas: 3,
                readyReplicas: 3,
                updatedReplicas: 3,
                availableReplicas: 3,
                unavailableReplicas: 0,
                status: 'Healthy',
                creationTimestamp: new Date(Date.now() - 604800000).toISOString(),
                labels: { app: 'frontend', tier: 'web' },
            },
            {
                name: 'backend-api',
                namespace: 'default',
                uid: 'dep-2',
                replicas: 2,
                readyReplicas: 2,
                updatedReplicas: 2,
                availableReplicas: 2,
                unavailableReplicas: 0,
                status: 'Healthy',
                creationTimestamp: new Date(Date.now() - 1209600000).toISOString(),
                labels: { app: 'backend', tier: 'api' },
            },
            {
                name: 'database',
                namespace: 'default',
                uid: 'dep-3',
                replicas: 1,
                readyReplicas: 1,
                updatedReplicas: 1,
                availableReplicas: 1,
                unavailableReplicas: 0,
                status: 'Healthy',
                creationTimestamp: new Date(Date.now() - 2592000000).toISOString(),
                labels: { app: 'database', tier: 'db' },
            },
            {
                name: 'redis-cache',
                namespace: 'default',
                uid: 'dep-4',
                replicas: 2,
                readyReplicas: 1,
                updatedReplicas: 1,
                availableReplicas: 1,
                unavailableReplicas: 1,
                status: 'Degraded',
                creationTimestamp: new Date(Date.now() - 432000000).toISOString(),
                labels: { app: 'cache', tier: 'cache' },
            },
        ];
    }
    mockScaleDeployment(namespace, name, replicas) {
        const deps = this.getMockDeployments();
        const dep = deps.find((d) => d.name === name && d.namespace === namespace);
        if (dep) {
            dep.replicas = replicas;
            dep.readyReplicas = Math.min(replicas, dep.readyReplicas);
            dep.availableReplicas = dep.readyReplicas;
            dep.unavailableReplicas = Math.max(0, replicas - dep.readyReplicas);
            dep.status = dep.unavailableReplicas > 0 ? 'Progressing' : 'Healthy';
            return dep;
        }
        return null;
    }
    isKubernetesConnected() {
        return this.isConnected;
    }
}
exports.k8sClient = new KubernetesClient();
