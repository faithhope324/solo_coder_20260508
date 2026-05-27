import React from 'react';
import { DeploymentInfo } from '../types';

interface HealthPanelProps {
  deployments: DeploymentInfo[];
  selectedDeployment: string | null;
  onSelectDeployment: (name: string) => void;
}

const HealthPanel: React.FC<HealthPanelProps> = ({
  deployments,
  selectedDeployment,
  onSelectDeployment,
}) => {
  const getStatusClass = (status: string) => {
    return status.toLowerCase();
  };

  return (
    <div className="section section-full">
      <h2 className="section-title">
        <span className="status-dot healthy"></span>
        服务健康状态
      </h2>
      <div className="health-cards">
        {deployments.map((deployment) => (
          <div
            key={deployment.uid}
            className={`health-card ${getStatusClass(deployment.status)} ${
              selectedDeployment === deployment.name ? 'selected' : ''
            }`}
            onClick={() => onSelectDeployment(deployment.name)}
          >
            <div className="health-card-name">{deployment.name}</div>
            <div className="health-card-replicas">
              {deployment.readyReplicas} / {deployment.replicas} 副本运行中
            </div>
            <span className={`health-card-status ${getStatusClass(deployment.status)}`}>
              {deployment.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HealthPanel;
