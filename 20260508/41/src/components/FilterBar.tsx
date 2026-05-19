import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { BranchInfo, DateRange } from '../types';

interface FilterBarProps {
  branches: BranchInfo[];
  selectedBranch: string;
  dateRange: DateRange;
  onBranchChange: (branch: string) => void;
  onDateRangeChange: (range: DateRange) => void;
}

const QUICK_OPTIONS = [
  { label: '今天', getRange: () => ({ start: format(new Date(), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
  { label: '近7天', getRange: () => ({ start: format(subDays(new Date(), 6), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
  { label: '近30天', getRange: () => ({ start: format(subDays(new Date(), 29), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
  { label: '本月', getRange: () => ({ start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }) },
  { label: '近3个月', getRange: () => ({ start: format(subMonths(new Date(), 2), 'yyyy-MM-dd'), end: format(new Date(), 'yyyy-MM-dd') }) },
];

export function FilterBar({ branches, selectedBranch, dateRange, onBranchChange, onDateRangeChange }: FilterBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">分支:</label>
          <select
            value={selectedBranch}
            onChange={(e) => onBranchChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[180px]"
          >
            {branches.map((branch) => (
              <option key={branch.name} value={branch.name}>
                {branch.name} {branch.isDefault && '(默认)'}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">时间范围:</label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {QUICK_OPTIONS.map((option) => (
            <button
              key={option.label}
              onClick={() => onDateRangeChange(option.getRange())}
              className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
