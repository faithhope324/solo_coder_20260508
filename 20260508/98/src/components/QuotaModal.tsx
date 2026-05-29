import React, { useState, useEffect } from 'react';
import { X, Cpu, MemoryStick, HardDrive, Save } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import { cn } from '../lib/utils';

export const QuotaModal: React.FC = () => {
  const { selectedTenant, isModalOpen, closeModal, updateQuota, loading } = useTenantStore();
  const [cpuQuota, setCpuQuota] = useState('');
  const [memoryQuota, setMemoryQuota] = useState('');
  const [storageQuota, setStorageQuota] = useState('');
  const [errors, setErrors] = useState<{ cpu?: string; memory?: string; storage?: string }>({});

  useEffect(() => {
    if (selectedTenant) {
      setCpuQuota(selectedTenant.cpu.quota.toString());
      setMemoryQuota(selectedTenant.memory.quota.toString());
      setStorageQuota(selectedTenant.storage.quota.toString());
      setErrors({});
    }
  }, [selectedTenant]);

  if (!isModalOpen || !selectedTenant) return null;

  const validate = (): boolean => {
    const newErrors: { cpu?: string; memory?: string; storage?: string } = {};

    const cpu = parseFloat(cpuQuota);
    const memory = parseFloat(memoryQuota);
    const storage = parseFloat(storageQuota);

    if (isNaN(cpu) || cpu <= 0) newErrors.cpu = '请输入有效的正数';
    if (isNaN(memory) || memory <= 0) newErrors.memory = '请输入有效的正数';
    if (isNaN(storage) || storage <= 0) newErrors.storage = '请输入有效的正数';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const updates: { cpuQuota?: number; memoryQuota?: number; storageQuota?: number } = {};
    const cpu = parseFloat(cpuQuota);
    const memory = parseFloat(memoryQuota);
    const storage = parseFloat(storageQuota);

    if (cpu !== selectedTenant.cpu.quota) updates.cpuQuota = cpu;
    if (memory !== selectedTenant.memory.quota) updates.memoryQuota = memory;
    if (storage !== selectedTenant.storage.quota) updates.storageQuota = storage;

    if (Object.keys(updates).length === 0) {
      closeModal();
      return;
    }

    await updateQuota(selectedTenant.id, updates);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">调整资源配额</h2>
          <button
            onClick={closeModal}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5">
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm font-medium text-blue-800">{selectedTenant.name}</p>
            <p className="text-xs text-blue-600">当前使用量：CPU {selectedTenant.cpu.used} 核 / 内存 {selectedTenant.memory.used} GB / 存储 {selectedTenant.storage.used} TB</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <Cpu className="w-4 h-4" />
                CPU 配额（核）
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={cpuQuota}
                onChange={(e) => setCpuQuota(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all',
                  errors.cpu
                    ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                )}
              />
              {errors.cpu && <p className="text-xs text-red-600 mt-1">{errors.cpu}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <MemoryStick className="w-4 h-4" />
                内存配额（GB）
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={memoryQuota}
                onChange={(e) => setMemoryQuota(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all',
                  errors.memory
                    ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                )}
              />
              {errors.memory && <p className="text-xs text-red-600 mt-1">{errors.memory}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-1.5">
                <HardDrive className="w-4 h-4" />
                存储配额（TB）
              </label>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={storageQuota}
                onChange={(e) => setStorageQuota(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-all',
                  errors.storage
                    ? 'border-red-300 focus:ring-red-500 focus:border-transparent'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-transparent'
                )}
              />
              {errors.storage && <p className="text-xs text-red-600 mt-1">{errors.storage}</p>}
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {loading ? '保存中...' : '确认保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
