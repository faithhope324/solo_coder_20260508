import React, { useState, useEffect, useCallback, useRef } from 'react';
import HealthPanel from './components/HealthPanel';
import ResourceTable from './components/ResourceTable';
import EventStream from './components/EventStream';
import { api, createEventWebSocket } from './services/api';
import { DeploymentInfo, PodInfo, PodMetrics, Event } from './types';

const App: React.FC = () => {
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [pods, setPods] = useState<PodInfo[]>([]);
  const [metrics, setMetrics] = useState<PodMetrics[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDeployment, setSelectedDeployment] = useState<string | null>(null);
  const [healthStatus, setHealthStatus] = useState<{
    status: string;
    kubernetes: boolean;
    docker: boolean;
  } | null>(null);
  const [wsStatus, setWsStatus] = useState<'connected' | 'reconnecting' | 'disconnected'>('disconnected');
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const manualCloseRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const [deploymentsData, podsData, metricsData, eventsData, healthData] = await Promise.all([
        api.getDeployments(),
        api.getPods(),
        api.getPodMetrics(),
        api.getEvents(),
        api.getHealth(),
      ]);

      setDeployments(deploymentsData);
      setPods(podsData);
      setMetrics(metricsData);
      setEvents(eventsData);
      setHealthStatus(healthData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }, []);

  const handleScaleOptimistic = useCallback(
    (namespace: string, name: string, replicas: number) => {
      setDeployments((prev) =>
        prev.map((d) => {
          if (d.namespace === namespace && d.name === name) {
            const newReadyReplicas = Math.min(replicas, d.readyReplicas);
            return {
              ...d,
              replicas,
              readyReplicas: newReadyReplicas,
              availableReplicas: newReadyReplicas,
              unavailableReplicas: Math.max(0, replicas - newReadyReplicas),
              status: replicas > newReadyReplicas ? 'Progressing' : d.status,
            };
          }
          return d;
        })
      );
    },
    []
  );

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const connectWebSocket = () => {
      if (manualCloseRef.current) return;

      console.log('WebSocket 正在连接...');
      const ws = createEventWebSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket 已连接');
        setWsStatus('connected');
        setReconnectAttempt(0);
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type && data.id) {
            setEvents((prev) => [data, ...prev].slice(0, 100));
          }
        } catch (e) {
          // ignore parse errors
        }
      };

      ws.onerror = (error) => {
        console.log('WebSocket 错误:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket 已断开, code:', event.code);
        setWsStatus('reconnecting');

        if (!manualCloseRef.current) {
          const attempt = reconnectAttempt + 1;
          setReconnectAttempt(attempt);
          const delay = Math.min(1000 * Math.pow(2, Math.min(attempt - 1, 5)), 30000);
          console.log(`WebSocket ${delay}ms 后进行第 ${attempt} 次重连...`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        }
      };
    };

    connectWebSocket();

    return () => {
      manualCloseRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [reconnectAttempt]);

  const healthyCount = deployments.filter((d) => d.status === 'Healthy').length;
  const totalReplicas = deployments.reduce((sum, d) => sum + d.replicas, 0);
  const runningPods = pods.filter((p) => p.status === 'Running').length;

  const getWsStatusText = () => {
    switch (wsStatus) {
      case 'connected':
        return '已连接';
      case 'reconnecting':
        return `重连中 (${reconnectAttempt})`;
      default:
        return '未连接';
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1>🚀 容器化应用编排监控</h1>
          {healthStatus && (
            <div className="header-connections">
              <span
                className={`connection-status ${healthStatus.kubernetes ? 'connected' : 'disconnected'}`}
              >
                <span className="connection-dot"></span>
                K8s
              </span>
              <span
                className={`connection-status ${healthStatus.docker ? 'connected' : 'disconnected'}`}
              >
                <span className="connection-dot"></span>
                Docker
              </span>
              <span
                className={`connection-status ${wsStatus === 'connected' ? 'connected' : 'disconnected'}`}
              >
                <span className="connection-dot"></span>
                WS: {getWsStatusText()}
              </span>
            </div>
          )}
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-label">健康服务</span>
            <span className="stat-value">{healthyCount}/{deployments.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">运行中 Pod</span>
            <span className="stat-value">{runningPods}/{pods.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总副本数</span>
            <span className="stat-value">{totalReplicas}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">事件数</span>
            <span className="stat-value">{events.length}</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <HealthPanel
          deployments={deployments}
          selectedDeployment={selectedDeployment}
          onSelectDeployment={setSelectedDeployment}
        />

        <ResourceTable
          pods={pods}
          metrics={metrics}
          deployments={deployments}
          onScale={handleScaleOptimistic}
        />

        <div className="section section-full">
          <EventStream events={events} />
        </div>
      </main>
    </div>
  );
};

export default App;
