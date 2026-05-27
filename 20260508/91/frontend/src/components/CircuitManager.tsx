import React, { useState, useEffect } from 'react'
import type { CircuitInfo } from '../types'
import { listCircuits } from '../api'

interface CircuitManagerProps {
  currentCircuitId: string | null
  onLoadCircuit: (circuitId: string) => void
  onDeleteCircuit: (circuitId: string) => void
}

const CircuitManager: React.FC<CircuitManagerProps> = ({
  currentCircuitId,
  onLoadCircuit,
  onDeleteCircuit,
}) => {
  const [circuits, setCircuits] = useState<CircuitInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchCircuits = async () => {
      setLoading(true)
      try {
        const response = await listCircuits()
        setCircuits(response.circuits)
      } catch (err) {
        console.error('Failed to load circuits:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCircuits()
  }, [refreshKey])

  const handleDelete = async (circuitId: string) => {
    if (confirm('确定要删除这个电路吗？')) {
      await onDeleteCircuit(circuitId)
      setRefreshKey(k => k + 1)
    }
  }

  return (
    <div className="circuit-manager">
      <div className="manager-header">
        <h3>已保存电路</h3>
        <button
          className="btn-refresh"
          onClick={() => setRefreshKey(k => k + 1)}
          title="刷新列表"
        >
          🔄
        </button>
      </div>
      {loading ? (
        <div className="loading">加载中...</div>
      ) : circuits.length === 0 ? (
        <div className="no-circuits">暂无保存的电路</div>
      ) : (
        <div className="circuit-list">
          {circuits.map(circuit => (
            <div
              key={circuit.id}
              className={`circuit-item ${circuit.id === currentCircuitId ? 'active' : ''}`}
            >
              <div className="circuit-info">
                <div className="circuit-name">{circuit.name}</div>
                <div className="circuit-meta">
                  {circuit.num_qubits} 量子比特 · {circuit.gate_count} 门
                </div>
              </div>
              <div className="circuit-actions">
                <button
                  className="btn-load"
                  onClick={() => onLoadCircuit(circuit.id)}
                  title="加载电路"
                >
                  📂
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(circuit.id)}
                  title="删除电路"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CircuitManager