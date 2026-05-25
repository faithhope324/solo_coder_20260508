import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Layers, Eye, EyeOff, Wind } from 'lucide-react'
import { useSimulationStore } from '@/store/useSimulationStore'
import type { GridPoint, ContourData } from '@/types'

interface MapViewProps {
  isLoading: boolean
}

const COLOR_SCALE = [
  { value: 0.1, color: 'rgba(14, 165, 233, 0.15)' },
  { value: 1, color: 'rgba(14, 165, 233, 0.3)' },
  { value: 5, color: 'rgba(34, 197, 94, 0.4)' },
  { value: 10, color: 'rgba(132, 204, 22, 0.5)' },
  { value: 25, color: 'rgba(234, 179, 8, 0.6)' },
  { value: 50, color: 'rgba(249, 115, 22, 0.7)' },
  { value: 100, color: 'rgba(239, 68, 68, 0.8)' },
  { value: 250, color: 'rgba(127, 29, 29, 0.9)' }
]

const CONTOUR_COLORS = [
  '#0ea5e9',
  '#22c55e',
  '#84cc16',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#7f1d1d'
]

export function MapView({ isLoading }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const heatmapLayerRef = useRef<L.Layer | null>(null)
  const contourLayerRef = useRef<L.ImageOverlay | null>(null)
  const sourceMarkerRef = useRef<L.Marker | null>(null)
  const windArrowRef = useRef<L.Polyline | null>(null)
  const maxPointMarkerRef = useRef<L.CircleMarker | null>(null)

  const [showContours, setShowContours] = useState(true)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [opacity, setOpacity] = useState(0.8)

  const { source, meteorology, result, setSource } = useSimulationStore()

  const getColorForConcentration = useCallback((concentration: number): string => {
    for (let i = COLOR_SCALE.length - 1; i >= 0; i--) {
      if (concentration >= COLOR_SCALE[i].value) {
        return COLOR_SCALE[i].color
      }
    }
    return 'rgba(14, 165, 233, 0.05)'
  }, [])

  const createCustomIcon = useCallback((color: string, size: number = 32) => {
    return L.divIcon({
      html: `<div style="width: ${size}px; height: ${size}px; background: ${color}; border-radius: 50%; box-shadow: 0 0 20px ${color}; display: flex; align-items: center; justify-content: center;">
        <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>`,
      className: 'custom-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    })
  }, [])

  const createHeatmapCanvas = useCallback((grid: GridPoint[][], bounds: L.LatLngBounds) => {
    const canvas = document.createElement('canvas')
    const width = grid[0].length
    const height = grid.length
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const imageData = ctx.createImageData(width, height)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const concentration = grid[y][x].concentration
        const color = getColorForConcentration(concentration)

        const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/)
        const idx = (y * width + x) * 4

        if (rgbaMatch) {
          imageData.data[idx] = parseInt(rgbaMatch[1])
          imageData.data[idx + 1] = parseInt(rgbaMatch[2])
          imageData.data[idx + 2] = parseInt(rgbaMatch[3])
          imageData.data[idx + 3] = Math.floor((parseFloat(rgbaMatch[4] || '1') * opacity) * 255)
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }, [getColorForConcentration, opacity])

  const createContourSVG = useCallback((contourData: ContourData, bounds: L.LatLngBounds): string => {
    const southWest = bounds.getSouthWest()
    const northEast = bounds.getNorthEast()
    const width = northEast.lng - southWest.lng
    const height = northEast.lat - southWest.lat

    let svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
    `

    const { levels, paths, bounds: dataBounds } = contourData
    if (dataBounds) {
      const dataWidth = dataBounds.xMax - dataBounds.xMin
      const dataHeight = dataBounds.yMax - dataBounds.yMin

      paths.forEach((levelPaths, levelIndex) => {
        const color = CONTOUR_COLORS[levelIndex % CONTOUR_COLORS.length]
        const level = levels[levelIndex]

        levelPaths.forEach((path) => {
          const transformedPath = path
            .replace(/M([-\d.]+),([-\d.]+)/g, (_, x, y) => {
              const nx = ((parseFloat(x) - dataBounds.xMin) / dataWidth) * width
              const ny = ((dataBounds.yMax - parseFloat(y)) / dataHeight) * height
              return `M${nx},${ny}`
            })
            .replace(/L([-\d.]+),([-\d.]+)/g, (_, x, y) => {
              const nx = ((parseFloat(x) - dataBounds.xMin) / dataWidth) * width
              const ny = ((dataBounds.yMax - parseFloat(y)) / dataHeight) * height
              return `L${nx},${ny}`
            })

          svgContent += `
            <path d="${transformedPath}" 
                  fill="none" 
                  stroke="${color}" 
                  stroke-width="2" 
                  stroke-opacity="0.9">
              <title>${level.toFixed(2)} μg/m³</title>
            </path>
          `
        })
      })
    }

    svgContent += '</svg>'
    return svgContent
  }, [])

  const updateWindArrow = useCallback(() => {
    if (!mapInstanceRef.current) return

    if (windArrowRef.current) {
      mapInstanceRef.current.removeLayer(windArrowRef.current)
    }

    const arrowLength = 500
    const windDirection = meteorology.windDirection
    const windRad = (windDirection * Math.PI) / 180

    const sourceLatLng = L.latLng(source.latitude, source.longitude)
    const endLat = source.latitude - (arrowLength / 111319.9) * Math.cos(windRad)
    const endLng = source.longitude + (arrowLength / (111319.9 * Math.cos((source.latitude * Math.PI) / 180))) * Math.sin(windRad)
    const endLatLng = L.latLng(endLat, endLng)

    const arrowPoints: L.LatLngExpression[] = [sourceLatLng, endLatLng]

    windArrowRef.current = L.polyline(arrowPoints, {
      color: '#f97316',
      weight: 3,
      opacity: 0.8,
      dashArray: '10, 10'
    }).addTo(mapInstanceRef.current)

    const arrowHeadIcon = L.divIcon({
      html: `<div style="transform: rotate(${windDirection}deg); color: #f97316;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L8 6h3v12h2V6h3z"/>
        </svg>
      </div>`,
      className: 'arrow-head',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    })

    L.marker(endLatLng, { icon: arrowHeadIcon, interactive: false }).addTo(mapInstanceRef.current)
  }, [source.latitude, source.longitude, meteorology.windDirection])

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    mapInstanceRef.current = L.map(mapRef.current, {
      center: [source.latitude, source.longitude],
      zoom: 13,
      zoomControl: false,
      attributionControl: true
    })

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19
    }).addTo(mapInstanceRef.current)

    L.control.zoom({ position: 'bottomright' }).addTo(mapInstanceRef.current)

    mapInstanceRef.current.on('click', (e: L.LeafletMouseEvent) => {
      setSource({
        longitude: e.latlng.lng,
        latitude: e.latlng.lat
      })
    })

    sourceMarkerRef.current = L.marker([source.latitude, source.longitude], {
      icon: createCustomIcon('#f97316', 40)
    })
      .bindPopup('污染源位置<br>点击地图可重新定位')
      .addTo(mapInstanceRef.current)

    return () => {
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current || !sourceMarkerRef.current) return

    sourceMarkerRef.current.setLatLng([source.latitude, source.longitude])
    sourceMarkerRef.current.bindPopup(
      `污染源位置<br>经度: ${source.longitude.toFixed(4)}<br>纬度: ${source.latitude.toFixed(4)}`
    )

    updateWindArrow()
  }, [source.latitude, source.longitude, updateWindArrow])

  useEffect(() => {
    if (!mapInstanceRef.current || !result) return

    if (heatmapLayerRef.current) {
      mapInstanceRef.current.removeLayer(heatmapLayerRef.current)
    }
    if (contourLayerRef.current) {
      mapInstanceRef.current.removeLayer(contourLayerRef.current)
    }
    if (maxPointMarkerRef.current) {
      mapInstanceRef.current.removeLayer(maxPointMarkerRef.current)
    }

    const grid = result.grid
    const southWest = L.latLng(grid[grid.length - 1][0].lat, grid[0][0].lon)
    const northEast = L.latLng(grid[0][grid[0].length - 1].lat, grid[grid.length - 1][grid[0].length - 1].lon)
    const bounds = L.latLngBounds(southWest, northEast)

    if (showHeatmap) {
      const canvas = createHeatmapCanvas(grid, bounds)
      if (canvas) {
        heatmapLayerRef.current = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: 1,
          interactive: false
        }).addTo(mapInstanceRef.current)
      }
    }

    if (showContours && result.contourData) {
      const svgString = createContourSVG(result.contourData, bounds)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
      const svgUrl = URL.createObjectURL(svgBlob)

      contourLayerRef.current = L.imageOverlay(svgUrl, bounds, {
        opacity: 1,
        interactive: false,
        className: 'contour-overlay'
      }).addTo(mapInstanceRef.current)
    }

    if (result.maxConcentrationPoint) {
      maxPointMarkerRef.current = L.circleMarker(
        [result.maxConcentrationPoint.lat, result.maxConcentrationPoint.lon],
        {
          radius: 8,
          fillColor: '#ef4444',
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }
      )
        .bindPopup(`最大浓度点<br>${result.maxConcentration.toFixed(2)} μg/m³`)
        .addTo(mapInstanceRef.current)
    }

    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] })
  }, [result, showHeatmap, showContours, createHeatmapCanvas, createContourSVG])

  useEffect(() => {
    if (!mapInstanceRef.current || !result) return

    if (heatmapLayerRef.current) {
      ;(heatmapLayerRef.current as L.ImageOverlay).setOpacity(opacity)
    }
  }, [opacity, result])

  return (
    <div className="relative flex-1">
      <div ref={mapRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[1000]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white font-medium">正在计算浓度分布...</p>
            <p className="text-slate-400 text-sm mt-1">高斯烟羽模型模拟中</p>
          </div>
        </div>
      )}

      <div className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-3 space-y-2 z-[1000] border border-slate-700">
        <div className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-2">
          <Layers className="w-3 h-3" />
          图层控制
        </div>

        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-all ${
            showHeatmap
              ? 'bg-cyan-500/20 text-cyan-400'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {showHeatmap ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          热力图
        </button>

        <button
          onClick={() => setShowContours(!showContours)}
          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-all ${
            showContours
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
          }`}
        >
          {showContours ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          等值线
        </button>

        <div className="pt-2 border-t border-slate-700">
          <label className="text-[10px] text-slate-400 block mb-1">
            透明度: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-500"
          />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-3 z-[1000] border border-slate-700">
        <div className="text-xs font-medium text-slate-300 mb-2">浓度图例 (μg/m³)</div>
        <div className="flex flex-col gap-1">
          {COLOR_SCALE.slice().reverse().map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-4 h-3 rounded"
                style={{ backgroundColor: item.color.replace(/[\d.]+\)$/, '1)') }}
              />
              <span className="text-[10px] text-slate-400 font-mono">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-4 left-4 bg-slate-800/95 backdrop-blur-sm rounded-lg p-3 z-[1000] border border-slate-700">
        <div className="text-xs font-medium text-slate-300 mb-2 flex items-center gap-2">
          <Wind className="w-3 h-3 text-orange-400" />
          气象条件
        </div>
        <div className="space-y-1 text-[10px]">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">风速</span>
            <span className="text-white font-mono">{meteorology.windSpeed} m/s</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">风向</span>
            <span className="text-white font-mono">{meteorology.windDirection}°</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">稳定度</span>
            <span className="text-white font-mono">{meteorology.stabilityClass}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
