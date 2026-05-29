import React, { useState } from 'react';
import { Search, ArrowUpDown, X } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import type { SortField, SortOrder } from '../shared/types';

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'name', label: '按名称排序' },
  { value: 'cpuUsage', label: '按CPU使用率排序' },
  { value: 'memoryUsage', label: '按内存使用率排序' },
  { value: 'storageUsage', label: '按存储使用率排序' },
];

export const SearchBar: React.FC = () => {
  const { searchQuery, sortBy, sortOrder, setSearchQuery, setSort, fetchTenants } = useTenantStore();
  const [inputValue, setInputValue] = useState(searchQuery);

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSort(e.target.value as SortField, sortOrder);
  };

  const toggleSortOrder = () => {
    setSort(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const handleSearch = () => {
    setSearchQuery(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="flex-1 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索租户名称..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {inputValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
              title="清除搜索"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 text-sm font-medium"
        >
          <Search className="w-4 h-4" />
          查询
        </button>
      </div>
      <div className="flex gap-2">
        <select
          value={sortBy}
          onChange={handleSortChange}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
        >
          {sortOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <button
          onClick={toggleSortOrder}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
          title={sortOrder === 'asc' ? '升序' : '降序'}
        >
          <ArrowUpDown className={`w-4 h-4 text-slate-600 transition-transform ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
          <span className="text-sm text-slate-600">{sortOrder === 'asc' ? '升序' : '降序'}</span>
        </button>
      </div>
    </div>
  );
};
