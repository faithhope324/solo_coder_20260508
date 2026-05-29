import { create } from 'zustand';
import type { Tenant, AuditLog, SortField, SortOrder } from '../shared/types';
import { api } from '../utils/api';

interface TenantState {
  tenants: Tenant[];
  auditLogs: AuditLog[];
  auditLogsTotal: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: SortField;
  sortOrder: SortOrder;
  selectedTenant: Tenant | null;
  isModalOpen: boolean;
  currentPage: number;
  pageSize: number;

  fetchTenants: () => Promise<void>;
  fetchAuditLogs: () => Promise<void>;
  updateQuota: (id: string, data: { cpuQuota?: number; memoryQuota?: number; storageQuota?: number }) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSort: (sortBy: SortField, sortOrder: SortOrder) => void;
  openModal: (tenant: Tenant) => void;
  closeModal: () => void;
  setCurrentPage: (page: number) => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  tenants: [],
  auditLogs: [],
  auditLogsTotal: 0,
  loading: false,
  error: null,
  searchQuery: '',
  sortBy: 'name',
  sortOrder: 'asc',
  selectedTenant: null,
  isModalOpen: false,
  currentPage: 1,
  pageSize: 10,

  fetchTenants: async () => {
    set({ loading: true, error: null });
    try {
      const { searchQuery, sortBy, sortOrder } = get();
      const result = await api.getTenants({ search: searchQuery, sortBy, sortOrder });
      set({ tenants: result.tenants, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch tenants', loading: false });
    }
  },

  fetchAuditLogs: async () => {
    set({ loading: true, error: null });
    try {
      const { currentPage, pageSize } = get();
      const result = await api.getAuditLogs({ page: currentPage, pageSize });
      set({ auditLogs: result.logs, auditLogsTotal: result.total, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch audit logs', loading: false });
    }
  },

  updateQuota: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const result = await api.updateQuota(id, data);
      set(state => ({
        tenants: state.tenants.map(t => t.id === id ? result.tenant : t),
        loading: false,
        isModalOpen: false,
        selectedTenant: null
      }));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update quota', loading: false });
    }
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    get().fetchTenants();
  },

  setSort: (sortBy, sortOrder) => {
    set({ sortBy, sortOrder });
    get().fetchTenants();
  },

  openModal: (tenant) => {
    set({ selectedTenant: tenant, isModalOpen: true });
  },

  closeModal: () => {
    set({ selectedTenant: null, isModalOpen: false });
  },

  setCurrentPage: (page) => {
    set({ currentPage: page });
    get().fetchAuditLogs();
  }
}));
