import { useState, useMemo } from 'react';
import {
  claimData,
  filterDataByGender,
  getSummaryStats,
  getAmountDistribution,
  getClaimRateByAgeGroup,
  getTopDiseases,
  getAgeVsAmount
} from './data/mockData';
import SummaryCard from './components/SummaryCard';
import GenderFilter from './components/GenderFilter';
import AmountHistogram from './components/AmountHistogram';
import AgeGroupBarChart from './components/AgeGroupBarChart';
import TopDiseasesBarChart from './components/TopDiseasesBarChart';
import AgeAmountScatter from './components/AgeAmountScatter';

function App() {
  const [selectedGender, setSelectedGender] = useState<'全部' | '男' | '女'>('全部');

  const filteredData = useMemo(() => {
    return filterDataByGender(claimData, selectedGender);
  }, [selectedGender]);

  const summaryStats = useMemo(() => {
    return getSummaryStats(filteredData);
  }, [filteredData]);

  const amountDistribution = useMemo(() => {
    return getAmountDistribution(filteredData);
  }, [filteredData]);

  const claimRateByAgeGroup = useMemo(() => {
    return getClaimRateByAgeGroup(filteredData, selectedGender);
  }, [filteredData, selectedGender]);

  const topDiseases = useMemo(() => {
    return getTopDiseases(filteredData, 10);
  }, [filteredData]);

  const ageVsAmount = useMemo(() => {
    return getAgeVsAmount(filteredData);
  }, [filteredData]);

  const formatCurrency = (value: number): string => {
    return (value / 10000).toFixed(2);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>医疗保险理赔分析</h1>
        <p className="subtitle">基于模拟数据的可视化分析</p>
      </header>

      <div className="filter-section">
        <GenderFilter selected={selectedGender} onChange={setSelectedGender} />
      </div>

      <div className="summary-section">
        <SummaryCard
          title="总赔付金额"
          value={formatCurrency(summaryStats.totalAmount)}
          icon="💰"
          suffix="万元"
        />
        <SummaryCard
          title="平均赔付额"
          value={formatCurrency(summaryStats.avgAmount)}
          icon="📊"
          suffix="万元"
        />
        <SummaryCard
          title="理赔案件数"
          value={summaryStats.totalCount.toLocaleString()}
          icon="📋"
          suffix="件"
        />
      </div>

      <div className="charts-grid">
        <div className="chart-card large">
          <AmountHistogram data={amountDistribution} />
        </div>
        <div className="chart-card">
          <AgeGroupBarChart data={claimRateByAgeGroup} />
        </div>
        <div className="chart-card">
          <TopDiseasesBarChart data={topDiseases} />
        </div>
        <div className="chart-card large">
          <AgeAmountScatter data={ageVsAmount} />
        </div>
      </div>

      <footer className="app-footer">
        <p>© 2026 医疗保险理赔分析系统 | 数据仅供演示</p>
      </footer>
    </div>
  );
}

export default App;
