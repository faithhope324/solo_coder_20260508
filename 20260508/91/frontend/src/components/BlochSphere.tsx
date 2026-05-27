import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

interface BlochSphereProps {
  x: number
  y: number
  z: number
}

const BlochSphere: React.FC<BlochSphereProps> = ({ x, y, z }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const vectorRef = useRef<THREE.ArrowHelper | null>(null)
  const animationRef = useRef<number | null>(null)
  const isDraggingRef = useRef(false)
  const previousMouseRef = useRef({ x: 0, y: 0 })
  const rotationRef = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    if (!containerRef.current) return

    const width = 200
    const height = 200

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xf8fafc)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
    camera.position.set(3, 3, 3)
    camera.lookAt(0, 0, 0)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32)
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
    scene.add(sphere)

    const wireGeometry = new THREE.SphereGeometry(1, 16, 16)
    const wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x94a3b8,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    })
    const wireSphere = new THREE.Mesh(wireGeometry, wireMaterial)
    scene.add(wireSphere)

    const axisLength = 1.2
    const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xef4444 })
    const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x22c55e })
    const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x3b82f6 })

    const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-axisLength, 0, 0),
      new THREE.Vector3(axisLength, 0, 0),
    ])
    const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, -axisLength, 0),
      new THREE.Vector3(0, axisLength, 0),
    ])
    const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, -axisLength),
      new THREE.Vector3(0, 0, axisLength),
    ])

    scene.add(new THREE.Line(xAxisGeometry, xAxisMaterial))
    scene.add(new THREE.Line(yAxisGeometry, yAxisMaterial))
    scene.add(new THREE.Line(zAxisGeometry, zAxisMaterial))

    const makeAxisLabel = (text: string, position: THREE.Vector3, color: string) => {
      const canvas = document.createElement('canvas')
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = color
      ctx.font = 'bold 32px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(text, 32, 32)
      const texture = new THREE.CanvasTexture(canvas)
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }))
      sprite.position.copy(position)
      sprite.scale.set(0.3, 0.3, 0.3)
      return sprite
    }

    scene.add(makeAxisLabel('X', new THREE.Vector3(axisLength + 0.15, 0, 0), '#ef4444'))
    scene.add(makeAxisLabel('Y', new THREE.Vector3(0, axisLength + 0.15, 0), '#22c55e'))
    scene.add(makeAxisLabel('Z', new THREE.Vector3(0, 0, axisLength + 0.15), '#3b82f6'))
    scene.add(makeAxisLabel('|0⟩', new THREE.Vector3(0, 0, axisLength + 0.1), '#3b82f6'))
    scene.add(makeAxisLabel('|1⟩', new THREE.Vector3(0, 0, -axisLength - 0.1), '#3b82f6'))

    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(x, y, z).normalize(),
      new THREE.Vector3(0, 0, 0),
      1,
      0x4f46e5,
      0.2,
      0.1
    )
    scene.add(arrowHelper)
    vectorRef.current = arrowHelper

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const deltaX = e.clientX - previousMouseRef.current.x
      const deltaY = e.clientY - previousMouseRef.current.y
      rotationRef.current.y += deltaX * 0.01
      rotationRef.current.x += deltaY * 0.01
      rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x))
      previousMouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    const canvas = renderer.domElement
    canvas.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)

      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.003
      }

      camera.position.x = 3 * Math.cos(rotationRef.current.x) * Math.sin(rotationRef.current.y)
      camera.position.y = 3 * Math.sin(rotationRef.current.x)
      camera.position.z = 3 * Math.cos(rotationRef.current.x) * Math.cos(rotationRef.current.y)
      camera.lookAt(0, 0, 0)

      renderer.render(scene, camera)
    }
    animate()

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      canvas.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      renderer.dispose()
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement)
      }
    }
  }, [])

  useEffect(() => {
    if (vectorRef.current) {
      const dir = new THREE.Vector3(x, y, z).normalize()
      vectorRef.current.setDirection(dir)
    }
  }, [x, y, z])

  return (
    <div className="bloch-sphere-container">
      <div ref={containerRef} className="bloch-sphere-canvas" />
      <p className="bloch-coords">
        坐标: ({x.toFixed(3)}, {y.toFixed(3)}, {z.toFixed(3)})
      </p>
    </div>
  )
}

export default BlochSphere