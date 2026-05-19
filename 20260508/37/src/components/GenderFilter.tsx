import React from 'react';

interface GenderFilterProps {
  selected: '全部' | '男' | '女';
  onChange: (value: '全部' | '男' | '女') => void;
}

const GenderFilter: React.FC<GenderFilterProps> = ({ selected, onChange }) => {
  const options: ('全部' | '男' | '女')[] = ['全部', '男', '女'];

  return (
    <div className="filter-container">
      <span className="filter-label">性别筛选：</span>
      <div className="filter-buttons">
        {options.map((option) => (
          <button
            key={option}
            className={`filter-btn ${selected === option ? 'active' : ''}`}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
};

export default GenderFilter;
