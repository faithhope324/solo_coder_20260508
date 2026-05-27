import React from 'react'
import type { Gate } from '../types'

interface CircuitEditorProps {
  numQubits: number
  gates: Gate[]
  gateTemplates: Record<string, { label: string; type: string; color: string; symbol: string }>
  onDrop: (row: number, col: number) => void
  onRemoveGate: (gateId: string) => void
  onClickCnotGate?: (gate: Gate) => void
}

const CELL_WIDTH = 64
const CELL_HEIGHT = 56
const GUTTER = 48

const CircuitEditor: React.FC<CircuitEditorProps> = ({
  numQubits,
  gates,
  gateTemplates,
  onDrop,
  onRemoveGate,
  onClickCnotGate,
}) => {
  const maxCol = Math.max(10, ...gates.map(g => g.col)) + 4
  const gridWidth = GUTTER + maxCol * CELL_WIDTH
  const gridHeight = numQubits * CELL_HEIGHT + 40

  const handleCellDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('drag-over')
  }

  const handleCellDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over')
  }

  const handleCellDrop = (e: React.DragEvent, row: number, col: number) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    onDrop(row, col)
  }

  const getGateAtPosition = (row: number, col: number) => {
    return gates.find(g => g.row === row && g.col === col)
  }

  return (
    <div className="circuit-editor">
      <h3>电路编辑器</h3>
      <div className="circuit-grid-wrapper">
        <svg
          width={gridWidth}
          height={gridHeight}
          className="circuit-svg"
        >
          {Array.from({ length: numQubits }).map((_, row) => (
            <g key={row}>
              <text
                x={8}
                y={row * CELL_HEIGHT + CELL_HEIGHT / 2 + 5}
                className="qubit-label"
              >
                q{row}
              </text>
              <line
                x1={GUTTER}
                y1={row * CELL_HEIGHT + CELL_HEIGHT / 2}
                x2={gridWidth}
                y2={row * CELL_HEIGHT + CELL_HEIGHT / 2}
                className="wire-line"
              />
            </g>
          ))}

          {Array.from({ length: numQubits }).map((_, row) =>
            Array.from({ length: maxCol }).map((_, col) => (
              <rect
                key={`cell-${row}-${col}`}
                x={GUTTER + col * CELL_WIDTH}
                y={row * CELL_HEIGHT}
                width={CELL_WIDTH}
                height={CELL_HEIGHT}
                className="grid-cell"
                onDragOver={handleCellDragOver}
                onDragLeave={handleCellDragLeave}
                onDrop={e => handleCellDrop(e, row, col)}
              />
            ))
          )}

          {gates.map(gate => {
            const template = gateTemplates[gate.type]
            if (!template) return null

            const cx = GUTTER + gate.col * CELL_WIDTH + CELL_WIDTH / 2
            const cy = gate.row * CELL_HEIGHT + CELL_HEIGHT / 2

            if (gate.type === 'CNOT') {
              const controlRow = gate.controls[0] ?? (gate.row === 0 ? 1 : 0)
              const controlCy = controlRow * CELL_HEIGHT + CELL_HEIGHT / 2

              return (
                <g key={gate.id}>
                  <line
                    x1={cx}
                    y1={controlCy}
                    x2={cx}
                    y2={cy}
                    className="cnot-connection"
                  />
                  <circle
                    cx={cx}
                    cy={controlCy}
                    r={8}
                    className="cnot-control"
                    onClick={() => onRemoveGate(gate.id)}
                    onDoubleClick={() => onClickCnotGate?.(gate)}
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={18}
                    className="cnot-target"
                    onClick={() => onRemoveGate(gate.id)}
                    onDoubleClick={() => onClickCnotGate?.(gate)}
                  />
                  <line
                    x1={cx - 12}
                    y1={cy}
                    x2={cx + 12}
                    y2={cy}
                    className="cnot-plus"
                  />
                  <line
                    x1={cx}
                    y1={cy - 12}
                    x2={cx}
                    y2={cy + 12}
                    className="cnot-plus"
                  />
                </g>
              )
            }

            return (
              <g key={gate.id}>
                <rect
                  x={cx - 20}
                  y={cy - 20}
                  width={40}
                  height={40}
                  rx={6}
                  className="gate-rect"
                  style={{ fill: template.color }}
                  onClick={() => onRemoveGate(gate.id)}
                />
                <text
                  x={cx}
                  y={cy + 6}
                  className="gate-text"
                >
                  {template.symbol}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="editor-hint">点击门可删除 · 双击 CNOT 门可配置控制比特</p>
    </div>
  )
}

export default CircuitEditor