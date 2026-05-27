import Docker from 'dockerode';
import { EventEmitter } from 'events';
import { ContainerInfo, ContainerStats, Event } from '../types';

class DockerClient extends EventEmitter {
  private docker: Docker;
  private isConnected: boolean = false;

  constructor() {
    super();
    this.docker = new Docker();
    this.testConnection();
    this.startWatching();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.docker.ping();
      this.isConnected = true;
      console.log('Docker API 连接成功');
    } catch (error) {
      console.warn('Docker API 连接失败，将使用模拟数据:', (error as Error).message);
      this.isConnected = false;
    }
  }

  private startWatching(): void {
    if (!this.isConnected) return;

    this.docker.getEvents({}, (err, stream) => {
      if (err) {
        console.error('Docker events error:', err);
        setTimeout(() => this.startWatching(), 5000);
        return;
      }

      if (!stream) return;

      stream.on('data', (chunk) => {
        try {
          const event = JSON.parse(chunk.toString('utf8'));
          this.handleDockerEvent(event);
        } catch {
          // ignore parse errors
        }
      });

      stream.on('error', (err) => {
        console.error('Docker event stream error:', err);
        setTimeout(() => this.startWatching(), 5000);
      });
    });
  }

  private handleDockerEvent(event: any): void {
    let appEvent: Event | null = null;
    const timestamp = new Date().toISOString();

    if (event.Type === 'container') {
      const containerName = event.Actor?.Attributes?.name || event.id;

      switch (event.Action) {
        case 'start':
          appEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'container_started',
            message: `容器 ${containerName} 已启动`,
            timestamp,
            source: 'docker',
            metadata: {
              containerId: event.id,
              containerName,
              image: event.Actor?.Attributes?.image || '',
            },
          };
          break;
        case 'die':
          appEvent = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'container_stopped',
            message: `容器 ${containerName} 已停止`,
            timestamp,
            source: 'docker',
            metadata: {
              containerId: event.id,
              containerName,
              exitCode: event.Actor?.Attributes?.exitCode || '0',
            },
          };
          break;
      }
    }

    if (appEvent) {
      this.emit('event', appEvent);
    }
  }

  async getContainers(): Promise<ContainerInfo[]> {
    if (!this.isConnected) {
      return this.getMockContainers();
    }

    try {
      const containers = await this.docker.listContainers({ all: true });
      return containers.map((container) => ({
        id: container.Id,
        name: container.Names[0]?.replace('/', '') || container.Id,
        image: container.Image,
        status: this.mapContainerStatus(container.State),
        state: container.State,
        createdAt: new Date(container.Created * 1000).toISOString(),
        ports: container.Ports.map((p) => ({
          privatePort: p.PrivatePort,
          publicPort: p.PublicPort,
          type: p.Type,
        })),
      }));
    } catch (error) {
      console.error('获取容器列表失败:', error);
      return this.getMockContainers();
    }
  }

  async getContainerStats(): Promise<ContainerStats[]> {
    if (!this.isConnected) {
      return this.getMockContainerStats();
    }

    try {
      const containers = await this.docker.listContainers();
      const stats: ContainerStats[] = [];

      for (const containerInfo of containers) {
        const container = this.docker.getContainer(containerInfo.Id);
        try {
          const statStream = await container.stats({ stream: false });
          const stat = this.calculateStats(statStream, containerInfo);
          if (stat) {
            stats.push(stat);
          }
        } catch {
          // ignore individual container stat errors
        }
      }

      return stats;
    } catch (error) {
      console.error('获取容器统计失败:', error);
      return this.getMockContainerStats();
    }
  }

  private calculateStats(stats: any, containerInfo: any): ContainerStats | null {
    try {
      const cpuDelta =
        stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta =
        stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuUsage = systemDelta > 0 ? (cpuDelta / systemDelta) * 100 : 0;

      const memoryUsage = stats.memory_stats.usage || 0;
      const memoryLimit = stats.memory_stats.limit || 0;

      const networkRx = stats.networks?.eth0?.rx_bytes || 0;
      const networkTx = stats.networks?.eth0?.tx_bytes || 0;

      return {
        containerId: containerInfo.Id,
        containerName: containerInfo.Names[0]?.replace('/', '') || containerInfo.Id,
        cpuUsage: Math.round(cpuUsage * 100) / 100,
        memoryUsage: Math.round((memoryUsage / 1024 / 1024) * 100) / 100,
        memoryLimit: Math.round((memoryLimit / 1024 / 1024) * 100) / 100,
        networkRx: Math.round(networkRx / 1024),
        networkTx: Math.round(networkTx / 1024),
        timestamp: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private mapContainerStatus(state: string): ContainerInfo['status'] {
    switch (state) {
      case 'running':
        return 'running';
      case 'exited':
      case 'created':
        return 'stopped';
      case 'paused':
        return 'paused';
      default:
        return 'error';
    }
  }

  private getMockContainers(): ContainerInfo[] {
    return [
      {
        id: 'abc123def456',
        name: 'nginx-web',
        image: 'nginx:alpine',
        status: 'running',
        state: 'running',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        ports: [
          { privatePort: 80, publicPort: 8080, type: 'tcp' },
        ],
      },
      {
        id: 'def456abc789',
        name: 'node-api',
        image: 'node:18-alpine',
        status: 'running',
        state: 'running',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        ports: [
          { privatePort: 3000, publicPort: 3000, type: 'tcp' },
        ],
      },
      {
        id: 'xyz789aaa111',
        name: 'postgres-db',
        image: 'postgres:15',
        status: 'running',
        state: 'running',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        ports: [
          { privatePort: 5432, publicPort: 5432, type: 'tcp' },
        ],
      },
      {
        id: 'aaa111bbb222',
        name: 'redis-cache',
        image: 'redis:7-alpine',
        status: 'stopped',
        state: 'exited',
        createdAt: new Date(Date.now() - 432000000).toISOString(),
        ports: [
          { privatePort: 6379, type: 'tcp' },
        ],
      },
    ];
  }

  private getMockContainerStats(): ContainerStats[] {
    return [
      {
        containerId: 'abc123def456',
        containerName: 'nginx-web',
        cpuUsage: 12.5,
        memoryUsage: 128.3,
        memoryLimit: 512,
        networkRx: 1024,
        networkTx: 2048,
        timestamp: new Date().toISOString(),
      },
      {
        containerId: 'def456abc789',
        containerName: 'node-api',
        cpuUsage: 45.8,
        memoryUsage: 256.7,
        memoryLimit: 1024,
        networkRx: 5120,
        networkTx: 3072,
        timestamp: new Date().toISOString(),
      },
      {
        containerId: 'xyz789aaa111',
        containerName: 'postgres-db',
        cpuUsage: 8.2,
        memoryUsage: 512.4,
        memoryLimit: 2048,
        networkRx: 256,
        networkTx: 512,
        timestamp: new Date().toISOString(),
      },
      {
        containerId: 'aaa111bbb222',
        containerName: 'redis-cache',
        cpuUsage: 0,
        memoryUsage: 0,
        memoryLimit: 256,
        networkRx: 0,
        networkTx: 0,
        timestamp: new Date().toISOString(),
      },
    ];
  }

  isDockerConnected(): boolean {
    return this.isConnected;
  }
}

export const dockerClient = new DockerClient();
