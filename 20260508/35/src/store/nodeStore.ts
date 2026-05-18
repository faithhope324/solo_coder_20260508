import { create } from 'zustand';
import type { NodeStore, CDNNode } from '../types';
import { createInitialNodes } from '../data/mockNodes';
import { updateNodeMetrics } from '../utils/dataGenerator';

export const useNodeStore = create<NodeStore>((set, get) => ({
  nodes: createInitialNodes(),
  selectedNode: null,
  isRefreshing: false,
  autoRefresh: false,
  refreshInterval: 10000,
  lastRefreshed: new Date(),

  setSelectedNode: (node: CDNNode | null) => set({ selectedNode: node }),

  setAutoRefresh: (enabled: boolean) => set({ autoRefresh: enabled }),

  setRefreshInterval: (interval: number) => set({ refreshInterval: interval }),

  refreshData: () => {
    set({ isRefreshing: true });

    setTimeout(() => {
      const { nodes, selectedNode } = get();
      const updatedNodes = nodes.map(node => updateNodeMetrics(node));

      let updatedSelectedNode = selectedNode;
      if (selectedNode) {
        updatedSelectedNode = updatedNodes.find(n => n.id === selectedNode.id) || null;
      }

      set({
        nodes: updatedNodes,
        selectedNode: updatedSelectedNode,
        isRefreshing: false,
        lastRefreshed: new Date(),
      });
    }, 300);
  },
}));
