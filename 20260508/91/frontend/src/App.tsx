import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { Gate, CircuitData, TaskStatus, BlochWithQubit } from './types'
import {
  runCircuit,
  getTaskStatus,
  saveCircuit,
  loadCircuit,
  listCircuits,
  deleteCircuit,
  getAllBlochCoordinates,
} from './api'
import CircuitEditor from './components/CircuitEditor'
import GatePalette from './components/GatePalette'
import ProbabilityChart from './components/ProbabilityChart'
import BlochSphere from './components/BlochSphere'
import CircuitManager from './components/CircuitManager'
import './App.css'

const GATE_TEMPLATES: Record<string, { label: string; type: string; color: string; symbol: string }> = {
  H: { label: 'H', type: 'H', color: '#4f46e5', symbol: 'H' },
  X: { label: 'X', type: 'X', color: '#059669', symbol: 'X' },
  Y: { label: 'Y', type: 'Y', color: '#d97706', symbol: 'Y' },
  Z: { label: 'Z', type: 'Z', color: '#dc2626', symbol: 'Z' },
  CNOT: { label: 'CNOT', type: 'CNOT', color: '#0891b2', symbol: '⊕' },
  T: { label: 'T', type: 'T', color: '#7c3aed', symbol: 'T' },
  S: { label: 'S', type: 'S', color: '#be185d', symbol: 'S' },
  MEASURE: { label: 'M', type: 'MEASURE', color: '#374151', symbol: 'M' },
}

function App() {
  const [numQubits, setNumQubits] = useState(3)
  const [gates, setGates] = useState<Gate[]>([])
  const [circuitName, setCircuitName] = useState('未命名电路')
  const [currentCircuitId, setCurrentCircuitId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatus | null>(null)
  const [polling, setPolling] = useState(false)
  const [blochCoordsList, setBlochCoordsList] = useState<BlochWithQubit[]>([])
  const [draggedGate, setDraggedGate] = useState<string | null>(null)
  const [editingCnotGate, setEditingCnotGate] = useState<Gate | null>(null)
  const pollIntervalRef = useRef<number | null>(null)

  const handleDragStart = useCallback((gateType: string) => {
    setDraggedGate(gateType)
  }, [])

  const handleDrop = useCallback((row: number, col: number) => {
    if (!draggedGate) return
    const template = GATE_TEMPLATES[draggedGate]
    if (!template) return

    const existingGate = gates.find(g => g.row === row && g.col === col)
    if (existingGate) {
      alert('该位置已存在量子门，请选择其他位置')
      setDraggedGate(null)
      return
    }

    const newGate: Gate = {
      id: `gate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      type: template.type,
      targets: [row],
      controls: template.type === 'CNOT' ? [row === 0 ? 1 : 0] : [],
      row,
      col,
    }

    setGates(prev => [...prev, newGate].sort((a, b) => a.col - b.col))
    setDraggedGate(null)

    if (template.type === 'CNOT') {
      setEditingCnotGate(newGate)
    }
  }, [draggedGate, gates])

  const handleUpdateCnotControl = useCallback((gateId: string, newControlQubit: number) => {
    setGates(prev => prev.map(g => {
      if (g.id === gateId) {
        return { ...g, controls: [newControlQubit] }
      }
      return g
    }))
  }, [])

  const handleCloseCnotEditor = useCallback(() => {
    setEditingCnotGate(null)
  }, [])

  const handleRemoveGate = useCallback((gateId: string) => {
    setGates(prev => prev.filter(g => g.id !== gateId))
  }, [])

  const handleAddQubit = useCallback(() => {
    setNumQubits(prev => Math.min(prev + 1, 8))
  }, [])

  const handleRemoveQubit = useCallback(() => {
    if (numQubits <= 1) return
    setNumQubits(prev => {
      const newCount = prev - 1
      setGates(g => g.filter(gate => gate.row < newCount))
      return newCount
    })
  }, [numQubits])

  const handleRunCircuit = useCallback(async () => {
    if (gates.length === 0) {
      alert('请先添加量子门')
      return
    }

    const circuit: CircuitData = {
      name: circuitName,
      num_qubits: numQubits,
      gates: gates.map(g => ({
        type: g.type,
        targets: g.targets,
        controls: g.controls,
      })),
    }

    try {
      setTaskStatus(null)
      setBlochCoordsList([])
      const response = await runCircuit(circuit, 1024)
      setTaskStatus({ task_id: response.task_id, status: 'pending', created_at: Date.now() / 1000 })
      setPolling(true)
    } catch (err) {
      alert(`运行失败: ${err}`)
    }
  }, [gates, circuitName, numQubits])

  useEffect(() => {
    if (!polling || !taskStatus) return

    const poll = async () => {
      try {
        const status = await getTaskStatus(taskStatus.task_id)
        setTaskStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          setPolling(false)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }

          if (status.status === 'completed' && status.result) {
            const blochResponse = await getAllBlochCoordinates(status.result.statevector, status.result.num_qubits)
            setBlochCoordsList(blochResponse.bloch_list)
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }

    pollIntervalRef.current = window.setInterval(poll, 1000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [polling, taskStatus])

  const handleSaveCircuit = useCallback(async () => {
    if (gates.length === 0) {
      alert('电路为空，无法保存')
      return
    }

    const circuit: CircuitData = {
      name: circuitName,
      num_qubits: numQubits,
      gates: gates.map(g => ({
        type: g.type,
        targets: g.targets,
        controls: g.controls,
      })),
    }

    try {
      const response = await saveCircuit(circuit, currentCircuitId || undefined)
      setCurrentCircuitId(response.circuit_id)
      alert('电路已保存')
    } catch (err) {
      alert(`保存失败: ${err}`)
    }
  }, [gates, circuitName, numQubits, currentCircuitId])

  const handleLoadCircuit = useCallback(async (circuitId: string) => {
    try {
      const circuit = await loadCircuit(circuitId)
      setCircuitName(circuit.name)
      setNumQubits(circuit.num_qubits)
      setCurrentCircuitId(circuitId)
      setGates(
        circuit.gates.map((g, i) => ({
          ...g,
          id: `gate-${Date.now()}-${i}`,
          row: g.targets[0] ?? 0,
          col: i,
        }))
      )
      setTaskStatus(null)
      setBlochCoordsList([])
    } catch (err) {
      alert(`加载失败: ${err}`)
    }
  }, [])

  const handleDeleteCircuit = useCallback(async (circuitId: string) => {
    try {
      await deleteCircuit(circuitId)
      if (currentCircuitId === circuitId) {
        setCurrentCircuitId(null)
      }
    } catch (err) {
      alert(`删除失败: ${err}`)
    }
  }, [currentCircuitId])

  const handleClearCircuit = useCallback(() => {
    setGates([])
    setTaskStatus(null)
    setBlochCoordsList([])
    setCurrentCircuitId(null)
    setCircuitName('未命名电路')
    setEditingCnotGate(null)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>⚛️ 量子电路模拟器</h1>
        <div className="header-actions">
          <input
            type="text"
            className="circuit-name-input"
            value={circuitName}
            onChange={e => setCircuitName(e.target.value)}
            placeholder="电路名称"
          />
          <button className="btn btn-primary" onClick={handleRunCircuit}>
            ▶ 运行电路
          </button>
          <button className="btn btn-save" onClick={handleSaveCircuit}>
            💾 保存
          </button>
          <button className="btn btn-clear" onClick={handleClearCircuit}>
            🗑 清空
          </button>
        </div>
      </header>

      <div className="main-content">
        <aside className="sidebar">
          <GatePalette gateTemplates={GATE_TEMPLATES} onDragStart={handleDragStart} />
          <div className="qubit-controls">
            <h3>量子比特</h3>
            <div className="qubit-count-display">{numQubits} 个量子比特</div>
            <div className="qubit-buttons">
              <button onClick={handleAddQubit} disabled={numQubits >= 8}>
                + 添加
              </button>
              <button onClick={handleRemoveQubit} disabled={numQubits <= 1}>
                - 移除
              </button>
            </div>
          </div>
          <CircuitManager
            currentCircuitId={currentCircuitId}
            onLoadCircuit={handleLoadCircuit}
            onDeleteCircuit={handleDeleteCircuit}
          />
        </aside>

        <main className="circuit-area">
          <CircuitEditor
            numQubits={numQubits}
            gates={gates}
            gateTemplates={GATE_TEMPLATES}
            onDrop={handleDrop}
            onRemoveGate={handleRemoveGate}
            onClickCnotGate={setEditingCnotGate}
          />

          <div className="results-section">
            {taskStatus && (
              <div className="task-status">
                <h3>任务状态</h3>
                <div className={`status-badge status-${taskStatus.status}`}>
                  {taskStatus.status === 'pending' && '⏳ 等待中...'}
                  {taskStatus.status === 'running' && '⚙️ 运行中...'}
                  {taskStatus.status === 'completed' && '✅ 已完成'}
                  {taskStatus.status === 'failed' && `❌ 失败: ${taskStatus.error}`}
                </div>
                {taskStatus.status === 'completed' && taskStatus.result && (
                  <div className="results-grid">
                    <div className="result-panel">
                      <h4>测量概率分布</h4>
                      <ProbabilityChart
                        probabilities={taskStatus.result.probabilities}
                      />
                    </div>
                    <div className="result-panel">
                      <h4>Bloch 球面表示 (各量子比特)</h4>
                      {blochCoordsList.length > 0 ? (
                        <div className="bloch-spheres-grid">
                          {blochCoordsList.map((coords) => (
                            <div key={coords.qubit} className="bloch-sphere-item">
                              <div className="bloch-sphere-label">q{coords.qubit}</div>
                              <BlochSphere
                                x={coords.x}
                                y={coords.y}
                                z={coords.z}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-data">暂无数据</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {editingCnotGate && (
        <div className="modal-overlay" onClick={handleCloseCnotEditor}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3>配置 CNOT 门</h3>
            <p className="modal-hint">选择控制比特（目标比特: q{editingCnotGate.targets[0]}）</p>
            <div className="control-qubit-selector">
              {Array.from({ length: numQubits }).map((_, idx) => {
                const isTarget = editingCnotGate.targets.includes(idx)
                const isSelected = editingCnotGate.controls.includes(idx)
                return (
                  <button
                    key={idx}
                    className={`qubit-option ${isTarget ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                    disabled={isTarget}
                    onClick={() => !isTarget && handleUpdateCnotControl(editingCnotGate.id, idx)}
                  >
                    q{idx}
                    {isTarget && ' (目标)'}
                    {isSelected && !isTarget && ' ✓'}
                  </button>
                )
              })}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={handleCloseCnotEditor}>
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App