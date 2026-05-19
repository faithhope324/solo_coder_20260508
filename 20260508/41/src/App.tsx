import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { FilterBar } from './components/FilterBar';
import { StatsCards } from './components/StatsCards';
import { TrendChart } from './components/TrendChart';
import { AuthorPieChart } from './components/AuthorPieChart';
import { HeatmapChart } from './components/HeatmapChart';
import { ContributionList } from './components/ContributionList';
import {
  mockBranches,
  getCommitsByBranch,
  getDailyCommits,
  getAuthorContributions,
  getExtensionStats,
  getRepoStats,
  filterCommitsByDate,
} from './data/mockData';
import type { DateRange } from './types';

function App() {
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const branchCommits = useMemo(() => {
    return getCommitsByBranch(selectedBranch);
  }, [selectedBranch]);

  const filteredCommits = useMemo(() => {
    return filterCommitsByDate(branchCommits, dateRange.start, dateRange.end);
  }, [branchCommits, dateRange]);

  const dailyData = useMemo(() => getDailyCommits(filteredCommits, dateRange.start, dateRange.end), [filteredCommits, dateRange]);
  const authorData = useMemo(() => getAuthorContributions(filteredCommits), [filteredCommits]);
  const extensionData = useMemo(() => getExtensionStats(filteredCommits), [filteredCommits]);
  const repoStats = useMemo(() => getRepoStats(filteredCommits), [filteredCommits]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-2 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Git 仓库统计面板</h1>
              <p className="text-sm text-gray-500">实时监控代码仓库的提交活动与贡献分布</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FilterBar
          branches={mockBranches}
          selectedBranch={selectedBranch}
          dateRange={dateRange}
          onBranchChange={setSelectedBranch}
          onDateRangeChange={setDateRange}
        />

        <StatsCards stats={repoStats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            <TrendChart data={dailyData} />
          </div>
          <div className="lg:col-span-1">
            <AuthorPieChart data={authorData} />
          </div>
        </div>

        <div className="mb-6">
          <HeatmapChart data={extensionData} />
        </div>

        <ContributionList authors={authorData} commits={filteredCommits} />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Git 仓库统计面板 © 2026 | 数据每 5 分钟自动刷新
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
