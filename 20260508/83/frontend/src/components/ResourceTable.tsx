import React, { useState } from 'react';
import { PodInfo, PodMetrics, DeploymentInfo } from '../types';
import { api } from '../services/api';

interface ResourceTableProps {
  pods: PodInfo[];
  metrics: PodMetrics[];
  deployments: DeploymentInfo[];
  onScale: (namespace: string, name: string, replicas: number) => void;
}

const ResourceTable: React.FC<ResourceTableProps> = ({ pods, metrics, deployments, onScale }) => {
  const [scalingPod, setScalingPod] = useState<string | null>(null);
  const [pendingScales, setPendingScales] = useState<Record<string, number>>({});

  const getPodMetrics = (podName: string) => {
    return metrics.find((m) => m.podName === podName);
  };

  const getDeploymentForPod = (podName: string) => {
    return deployments.find((d) => podName.startsWith(d.name));
  };

  const getDisplayReplicas = (deployment: DeploymentInfo) => {
    return pendingScales[deployment.name] !== undefined
      ? pendingScales[deployment.name]
      : deployment.replicas;
  };

  const handleScale = async (deployment: DeploymentInfo, delta: number) => {
    const currentReplicas = getDisplayReplicas(deployment);
    const newReplicas = Math.max(0, Math.min(10, currentReplicas + delta));
    if (newReplicas === currentReplicas) return;

    setScalingPod(deployment.name);
    setPendingScales((prev) => ({ ...prev, [deployment.name]: newReplicas }));

    try {
      await api.scaleDeployment(deployment.namespace, deployment.name, newReplicas);
      onScale(deployment.namespace, deployment.name, newReplicas);
    } catch (error) {
      console.error('Scale failed:', error);
      setPendingScales((prev) => {
        const newState = { ...prev };
        delete newState[deployment.name];
        return newState;
      });
    } finally {
      setScalingPod(null);
    }
  };

  const sortedPods = [...pods].sort((a, b) => {
    const metricsA = getPodMetrics(a.name);
    const metricsB = getPodMetrics(b.name);
    return (metricsB?.cpuUsage || 0) - (metricsA?.cpuUsage || 0);
  });

  return (
    <div className="section section-full">
      <h2 className="section-title">
        <span className="status-dot warning"></span>
        资源使用排行
      </h2>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Pod 名称</th>
              <th>状态</th>
              <th>CPU 使用</th>
              <th>内存使用</th>
              <th>节点</th>
              <th>副本控制</th>
            </tr>
          </thead>
          <tbody>
            {sortedPods.map((pod) => {
              const podMetrics = getPodMetrics(pod.name);
              const deployment = getDeploymentForPod(pod.name);
              return (
                <tr key={pod.uid}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{pod.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {pod.namespace}
                    </div>
                  </td>
                  <td>
                    <span className="pod-status">
                      <span className={`pod-status-dot ${pod.status.toLowerCase()}`}></span>
                      {pod.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="resource-bar">
                        <div
                          className="resource-bar-fill cpu"
                          style={{ width: `${Math.min(podMetrics?.cpuUsage || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span>{podMetrics?.cpuUsage.toFixed(1) || 0}%</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="resource-bar">
                        <div
                          className="resource-bar-fill memory"
                          style={{ width: `${Math.min((podMetrics?.memoryUsage || 0) / 10, 100)}%` }}
                        ></div>
                      </div>
                      <span>{podMetrics?.memoryUsage.toFixed(1) || 0} MB</span>
                    </div>
                  </td>
                  <td>{pod.nodeName || '-'}</td>
                  <td>
                    {deployment && (
                      <div className="scale-controls">
                        <button
                          className="scale-btn"
                          onClick={() => handleScale(deployment, -1)}
                          disabled={scalingPod === deployment.name || getDisplayReplicas(deployment) <= 0}
                        >
                          -
                        </button>
                        <span className="scale-value">{getDisplayReplicas(deployment)}</span>
                        <button
                          className="scale-btn"
                          onClick={() => handleScale(deployment, 1)}
                          disabled={scalingPod === deployment.name || getDisplayReplicas(deployment) >= 10}
                        >
                          +
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResourceTable;
