import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWeatherStore } from '@/store/weatherStore';
import { fetchGridData, fetchWindData, fetchPointData } from '@/api/weatherApi';
import { drawFilledContour, drawContourLines, drawStreamlines } from '@/utils/canvasRenderer';

export default function WeatherMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dataRef = useRef<any>(null);
  const renderModeRef = useRef<string>('contour');
  const variableRef = useRef<string>('temperature');

  const { variable, level, step, renderMode, setSelectedPoint, setPointData, setLoading } = useWeatherStore();

  variableRef.current = variable;
  renderModeRef.current = renderMode;

  const doRender = useCallback((data: any) => {
    const map = mapRef.current;
    const canvas = canvasRef.current;
    if (!map || !canvas || !data) return;

    const size = map.getSize();
    canvas.width = size.x;
    canvas.height = size.y;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bounds = map.getBounds();
    const mb = {
      north: bounds.getNorth(), south: bounds.getSouth(),
      east: bounds.getEast(), west: bounds.getWest(),
    };

    if (renderModeRef.current === 'streamline') {
      drawStreamlines(ctx, data, mb, canvas.width, canvas.height);
    } else {
      drawFilledContour(ctx, data, variableRef.current, mb, canvas.width, canvas.height);
      drawContourLines(ctx, data, variableRef.current, mb, canvas.width, canvas.height);
    }
  }, []);

  const renderData = useCallback(async () => {
    if (!mapRef.current) return;
    setLoading(true);
    try {
      let data;
      if (renderMode === 'streamline') {
        data = await fetchWindData(level, step);
      } else {
        data = await fetchGridData(variable, level, step);
      }
      dataRef.current = data;
      doRender(data);
    } catch (err) {
      console.error('Failed to render data:', err);
    } finally {
      setLoading(false);
    }
  }, [variable, level, step, renderMode, setLoading, doRender]);

  useEffect(() => {
    if (!containerRef.current) return;

    const mapEl = containerRef.current;

    const map = L.map(mapEl, {
      center: [35, 105],
      zoom: 4,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.75';
    canvas.style.zIndex = '450';

    mapEl.appendChild(canvas);
    canvasRef.current = canvas;
    mapRef.current = map;

    map.on('moveend zoomend resize', () => {
      if (dataRef.current) doRender(dataRef.current);
    });

    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedPoint({ lat, lon: lng });
      try {
        const data = await fetchPointData(lat, lng, level, step);
        setPointData(data);
      } catch (err) {
        console.error('Failed to fetch point data:', err);
      }
    });

    map.whenReady(() => {
      setTimeout(() => renderData(), 300);
    });

    return () => {
      map.off();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      map.remove();
      mapRef.current = null;
      canvasRef.current = null;
      dataRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      renderData();
    }
  }, [renderData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: '#0a0e1a' }}
    />
  );
}
