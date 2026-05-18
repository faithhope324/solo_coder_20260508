import { MapContainer, TileLayer } from 'react-leaflet';
import { NodeMarker } from './NodeMarker';
import { useNodeStore } from '../../store/nodeStore';
import 'leaflet/dist/leaflet.css';
import './map.css';

export const MapView = () => {
  const { nodes } = useNodeStore();

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxZoom={8}
        style={{ height: '100%', width: '100%', background: '#0f172a' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          className="map-tiles"
        />
        {nodes.map(node => (
          <NodeMarker key={node.id} node={node} />
        ))}
      </MapContainer>
    </div>
  );
};
