import React from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { DEFAULT_MATERIALS, Material } from '../../types';

const PropertyPanel: React.FC = () => {
  const {
    shapes,
    selectedShapeId,
    updateShape,
  } = useSimulationStore();
  
  const selectedShape = shapes.find(s => s.id === selectedShapeId);
  
  if (!selectedShape) {
    return (
      <div className="p-4 text-slate-400 text-center">
        <p className="text-sm">选择一个对象以编辑其属性</p>
      </div>
    );
  }
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateShape(selectedShape.id, { name: e.target.value });
  };
  
  const handleMaterialChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const materialKey = e.target.value;
    const material = DEFAULT_MATERIALS[materialKey];
    if (material) {
      updateShape(selectedShape.id, { material });
    }
  };
  
  const handlePermittivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateShape(selectedShape.id, {
        material: { ...selectedShape.material, permittivity: value }
      });
    }
  };
  
  const handleConductivityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateShape(selectedShape.id, {
        material: { ...selectedShape.material, conductivity: value }
      });
    }
  };
  
  const handleIsElectrodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isElectrode = e.target.checked;
    updateShape(selectedShape.id, {
      isElectrode,
      boundaryCondition: isElectrode
        ? { type: 'dirichlet', value: 0 }
        : undefined
    });
  };
  
  const handlePotentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      updateShape(selectedShape.id, {
        boundaryCondition: {
          type: 'dirichlet',
          value
        }
      });
    }
  };

  const typeLabels: Record<string, string> = {
    rectangle: '矩形',
    circle: '圆形',
    polygon: '多边形',
  };
  
  const materialOptions = Object.entries(DEFAULT_MATERIALS).map(([key, mat]) => (
    <option key={key} value={key}>{mat.name}</option>
  ));
  
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          对象名称
        </label>
        <input
          type="text"
          value={selectedShape.name}
          onChange={handleNameChange}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          图形类型
        </label>
        <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm">
          {typeLabels[selectedShape.type] || selectedShape.type}
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          预设材料
        </label>
        <select
          value={Object.entries(DEFAULT_MATERIALS).find(
            ([_, m]) => m.name === selectedShape.material.name
          )?.[0] || ''}
          onChange={handleMaterialChange}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
        >
          <option value="">-- 选择材料 --</option>
          {materialOptions}
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          相对介电常数 (εr)
        </label>
        <input
          type="number"
          value={selectedShape.material.permittivity}
          onChange={handlePermittivityChange}
          step="0.1"
          min="1"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          电导率 (σ, S/m)
        </label>
        <input
          type="number"
          value={selectedShape.material.conductivity}
          onChange={handleConductivityChange}
          step="1e-16"
          min="0"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </div>
      
      <div className="pt-2 border-t border-slate-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedShape.isElectrode}
            onChange={handleIsElectrodeChange}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
          />
          <span className="text-sm text-slate-300">设为电极</span>
        </label>
      </div>
      
      {selectedShape.isElectrode && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            边界电势 (V)
          </label>
          <input
            type="number"
            value={selectedShape.boundaryCondition?.value || 0}
            onChange={handlePotentialChange}
            step="1"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            Dirichlet边界条件: V = {selectedShape.boundaryCondition?.value || 0} V
          </p>
        </div>
      )}
    </div>
  );
};

export default PropertyPanel;
