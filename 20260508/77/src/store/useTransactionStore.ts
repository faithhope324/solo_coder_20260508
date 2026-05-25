import { create } from 'zustand';
import type { Transaction, StatsData, DetectionRatePoint } from '../types';

interface TransactionState {
  transactions: Transaction[];
  stats: StatsData;
  detectionRateHistory: DetectionRatePoint[];
  isConnected: boolean;
  addTransaction: (tx: Transaction) => void;
  setTransactions: (txs: Transaction[]) => void;
  setStats: (stats: StatsData) => void;
  setDetectionRateHistory: (data: DetectionRatePoint[]) => void;
  setConnected: (connected: boolean) => void;
}

const initialStats: StatsData = {
  totalTransactions: 0,
  fraudCount: 0,
  detectionRate: 0,
  totalFraudAmount: 0,
};

export const useTransactionStore = create<TransactionState>((set) => ({
  transactions: [],
  stats: initialStats,
  detectionRateHistory: [],
  isConnected: false,

  addTransaction: (tx: Transaction) =>
    set((state) => {
      const newTransactions = [tx, ...state.transactions].slice(0, 20);
      return { transactions: newTransactions };
    }),

  setTransactions: (txs: Transaction[]) =>
    set(() => ({
      transactions: txs.slice(0, 20),
    })),

  setStats: (stats: StatsData) =>
    set(() => ({
      stats,
    })),

  setDetectionRateHistory: (data: DetectionRatePoint[]) =>
    set(() => ({
      detectionRateHistory: data,
    })),

  setConnected: (connected: boolean) =>
    set(() => ({
      isConnected: connected,
    })),
}));
