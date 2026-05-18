import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { CDNNode } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import { useNodeStore } from '../../store/nodeStore';

interface NodeMarkerProps {
  node: CDNNode;
}

const createCustomIcon = (status: string, isSelected: boolean) => {
  const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS];
  const size = isSelected ? 16 : 12;
  const ringSize = isSelected ? 32 : 24;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div class="marker-wrapper" style="position: relative; width: ${ringSize}px; height: ${ringSize}px;">
        <div class="marker-ring" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${ringSize}px;
          height: ${ringSize}px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.4;
          animation: pulse-ring 2s ease-out infinite;
        "></div>
        <div class="marker-dot" style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 0 8px ${color};
          z-index: 1;
        "></div>
      </div>
    `,
    iconSize: [ringSize, ringSize],
    iconAnchor: [ringSize / 2, ringSize / 2],
  });
};

export const NodeMarker = ({ node }: NodeMarkerProps) => {
  const { selectedNode, setSelectedNode } = useNodeStore();
  const isSelected = selectedNode?.id === node.id;
  const icon = createCustomIcon(node.status, isSelected);

  return (
    <Marker
      position={[node.lat, node.lng]}
      icon={icon}
      eventHandlers={{
        click: () => {
          setSelectedNode(isSelected ? null : node);
        },
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
        <div className="font-medium text-sm">
          <div className="font-semibold">{node.name}</div>
          <div className="text-xs text-gray-500">{node.location}</div>
          <div className="flex items-center gap-1 mt-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[node.status] }}
            />
            <span className="text-xs">{STATUS_LABELS[node.status]}</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs font-mono">{node.latency}ms</span>
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
};
