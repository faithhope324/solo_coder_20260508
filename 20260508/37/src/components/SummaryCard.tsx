import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon?: string;
  suffix?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon, suffix }) => {
  return (
    <div className="summary-card">
      <div className="card-content">
        <div className="card-info">
          <p className="card-title">{title}</p>
          <p className="card-value">
            {value}
            {suffix && <span className="card-suffix">{suffix}</span>}
          </p>
        </div>
        {icon && <div className="card-icon">{icon}</div>}
      </div>
    </div>
  );
};

export default SummaryCard;
