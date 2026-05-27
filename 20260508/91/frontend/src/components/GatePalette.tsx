import React from 'react'

interface GatePaletteProps {
  gateTemplates: Record<string, { label: string; type: string; color: string; symbol: string }>
  onDragStart: (gateType: string) => void
}

const GatePalette: React.FC<GatePaletteProps> = ({ gateTemplates, onDragStart }) => {
  return (
    <div className="gate-palette">
      <h3>量子门</h3>
      <p className="palette-hint">拖拽门到电路网格中</p>
      <div className="gate-list">
        {Object.entries(gateTemplates).map(([key, gate]) => (
          <div
            key={key}
            className="gate-item"
            draggable
            onDragStart={e => {
              e.dataTransfer.setData('gateType', key)
              onDragStart(key)
            }}
            style={{ backgroundColor: gate.color }}
          >
            <span className="gate-symbol">{gate.symbol}</span>
            <span className="gate-label">{gate.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default GatePalette