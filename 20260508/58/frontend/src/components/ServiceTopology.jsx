import React, { useState, useEffect, useRef, useCallback } from 'react';

function ServiceTopology({ topology, onNodeClick, selectedService }) {
  const svgRef = useRef(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const animationRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const initializePositions = useCallback(() => {
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.35;

    const newNodes = topology.nodes.map((node, index) => {
      const angle = (index / Math.max(topology.nodes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      return {
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        vx: 0,
        vy: 0
      };
    });

    setNodes(newNodes);
    setEdges(topology.edges);
  }, [topology, dimensions]);

  useEffect(() => {
    initializePositions();
  }, [initializePositions]);

  useEffect(() => {
    if (nodes.length === 0) return;

    const simulate = () => {
      setNodes(prevNodes => {
        const { width, height } = dimensions;
        const nodeMap = new Map(prevNodes.map(n => [n.id, n]));
        
        const newNodes = prevNodes.map(node => ({
          ...node,
          vx: node.vx * 0.9,
          vy: node.vy * 0.9
        }));

        for (let i = 0; i < newNodes.length; i++) {
          for (let j = i + 1; j < newNodes.length; j++) {
            const n1 = newNodes[i];
            const n2 = newNodes[j];
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 2000 / (dist * dist);
            
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }

        for (const edge of edges) {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) continue;

          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const targetDist = 150;
          const force = (dist - targetDist) * 0.01;

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          const s = newNodes.find(n => n.id === source.id);
          const t = newNodes.find(n => n.id === target.id);
          if (s && t) {
            s.vx += fx;
            s.vy += fy;
            t.vx -= fx;
            t.vy -= fy;
          }
        }

        const centerX = width / 2;
        const centerY = height / 2;
        for (const node of newNodes) {
          node.vx += (centerX - node.x) * 0.001;
          node.vy += (centerY - node.y) * 0.001;
        }

        for (const node of newNodes) {
          node.x += node.vx;
          node.y += node.vy;
          node.x = Math.max(60, Math.min(width - 60, node.x));
          node.y = Math.max(40, Math.min(height - 40, node.y));
        }

        return newNodes;
      });

      animationRef.current = requestAnimationFrame(simulate);
    };

    animationRef.current = requestAnimationFrame(simulate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodes.length, edges, dimensions]);

  const getNodeColor = (node) => {
    if (node.id === selectedService) return '#3b82f6';
    const errorRate = parseFloat(node.errorRate) || 0;
    if (errorRate > 10) return '#ef4444';
    if (errorRate > 5) return '#f59e0b';
    return '#22c55e';
  };

  const getNodeRadius = (node) => {
    const baseSize = 25;
    const scale = Math.log10(node.callCount + 1) * 3;
    return Math.min(baseSize + scale, 45);
  };

  const handleNodeMouseEnter = (e, node) => {
    const rect = svgRef.current.getBoundingClientRect();
    setTooltip({
      x: e.clientX - rect.left + 10,
      y: e.clientY - rect.top + 10,
      node
    });
  };

  const handleNodeMouseLeave = () => {
    setTooltip(null);
  };

  return (
    <div className="topology-graph" ref={svgRef}>
      <div className="graph-controls">
        <button className="graph-btn" onClick={initializePositions}>
          🔄 重置布局
        </button>
      </div>
      
      <svg width="100%" height={dimensions.height}>
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
          </marker>
        </defs>

        {edges.map((edge, index) => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;

          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const sourceRadius = getNodeRadius(sourceNode);
          const targetRadius = getNodeRadius(targetNode);

          const startX = sourceNode.x + (dx / dist) * sourceRadius;
          const startY = sourceNode.y + (dy / dist) * sourceRadius;
          const endX = targetNode.x - (dx / dist) * targetRadius;
          const endY = targetNode.y - (dy / dist) * targetRadius;

          const opacity = Math.min(0.3 + edge.count * 0.1, 1);

          return (
            <g key={`edge-${index}`}>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="#475569"
                strokeWidth={Math.min(edge.count * 0.5, 4)}
                opacity={opacity}
                markerEnd="url(#arrowhead)"
              />
              <text
                x={(startX + endX) / 2}
                y={(startY + endY) / 2 - 5}
                fill="#94a3b8"
                fontSize="11"
                textAnchor="middle"
              >
                {edge.count}
              </text>
            </g>
          );
        })}

        {nodes.map(node => {
          const radius = getNodeRadius(node);
          return (
            <g
              key={node.id}
              onClick={() => onNodeClick(node.id)}
              onMouseEnter={(e) => handleNodeMouseEnter(e, node)}
              onMouseLeave={handleNodeMouseLeave}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={radius + 5}
                fill={node.id === selectedService ? '#3b82f6' : 'transparent'}
                opacity={0.3}
              />
              <circle
                cx={node.x}
                cy={node.y}
                r={radius}
                fill={getNodeColor(node)}
                stroke={node.id === selectedService ? '#60a5fa' : '#1e293b'}
                strokeWidth={node.id === selectedService ? 3 : 2}
              />
              <text
                x={node.x}
                y={node.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="11"
                fontWeight="500"
              >
                {node.label.length > 10 ? node.label.substring(0, 10) + '...' : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {tooltip && (
        <div
          className="node-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <div className="name">{tooltip.node.label}</div>
          <div className="stat">调用次数: {tooltip.node.callCount}</div>
          <div className="stat">错误率: {tooltip.node.errorRate}%</div>
          <div className="stat">平均延迟: {tooltip.node.avgLatency}ms</div>
        </div>
      )}
    </div>
  );
}

export default ServiceTopology;
