import React, { useState, useRef, useEffect } from 'react';
import { Button, Radio, InputNumber, Space, Typography, Tag } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

function GeometryCanvas({ shapes, onAddShape, onRemoveShape }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('rectangle');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [currentShape, setCurrentShape] = useState(null);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(0.5);
  const [radius, setRadius] = useState(0.3);

  const canvasWidth = 280;
  const canvasHeight = 280;

  const toCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / canvasWidth,
      y: (e.clientY - rect.top) / canvasHeight
    };
  };

  const toCanvasY = (y) => y * canvasHeight;
  const fromCanvasY = (canvasY) => canvasY / canvasHeight;

  const drawShapes = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(i * canvasWidth / 10, 0);
      ctx.lineTo(i * canvasWidth / 10, canvasHeight);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * canvasHeight / 10);
      ctx.lineTo(canvasWidth, i * canvasHeight / 10);
      ctx.stroke();
    }

    shapes.forEach((shape, index) => {
      ctx.strokeStyle = '#1890ff';
      ctx.fillStyle = 'rgba(24, 144, 255, 0.2)';
      ctx.lineWidth = 2;

      if (shape.type === 'rectangle') {
        const x = shape.x * canvasWidth;
        const y = shape.y * canvasHeight;
        const w = shape.width * canvasWidth;
        const h = shape.height * canvasHeight;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (shape.type === 'circle') {
        const cx = (shape.center_x || shape.x) * canvasWidth;
        const cy = (shape.center_y || shape.y) * canvasHeight;
        const r = shape.radius * Math.min(canvasWidth, canvasHeight);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });

    if (currentShape) {
      ctx.strokeStyle = '#52c41a';
      ctx.fillStyle = 'rgba(82, 196, 26, 0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      if (currentShape.type === 'rectangle') {
        const x = Math.min(currentShape.x, currentShape.x2) * canvasWidth;
        const y = Math.min(currentShape.y, currentShape.y2) * canvasHeight;
        const w = Math.abs(currentShape.x2 - currentShape.x) * canvasWidth;
        const h = Math.abs(currentShape.y2 - currentShape.y) * canvasHeight;
        ctx.fillRect(x, y, w, h);
        ctx.strokeRect(x, y, w, h);
      } else if (currentShape.type === 'circle') {
        const cx = currentShape.center_x * canvasWidth;
        const cy = currentShape.center_y * canvasHeight;
        const r = currentShape.radius * Math.min(canvasWidth, canvasHeight);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    drawShapes();
  }, [shapes, currentShape]);

  const handleMouseDown = (e) => {
    const pos = toCanvasCoords(e);
    setIsDrawing(true);
    setStartPoint(pos);

    if (tool === 'circle') {
      setCurrentShape({
        type: 'circle',
        center_x: pos.x,
        center_y: pos.y,
        radius: 0
      });
    } else {
      setCurrentShape({
        type: 'rectangle',
        x: pos.x,
        y: pos.y,
        x2: pos.x,
        y2: pos.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;
    
    const pos = toCanvasCoords(e);
    
    if (tool === 'circle' && startPoint) {
      const dx = pos.x - startPoint.x;
      const dy = pos.y - startPoint.y;
      setCurrentShape(prev => ({
        ...prev,
        radius: Math.sqrt(dx * dx + dy * dy)
      }));
    } else if (tool === 'rectangle') {
      setCurrentShape(prev => ({
        ...prev,
        x2: pos.x,
        y2: pos.y
      }));
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && currentShape) {
      if (currentShape.type === 'rectangle') {
        const w = Math.abs(currentShape.x2 - currentShape.x);
        const h = Math.abs(currentShape.y2 - currentShape.y);
        if (w > 0.05 && h > 0.05) {
          onAddShape({
            type: 'rectangle',
            x: Math.min(currentShape.x, currentShape.x2),
            y: Math.min(currentShape.y, currentShape.y2),
            width: w,
            height: h
          });
        }
      } else if (currentShape.type === 'circle') {
        if (currentShape.radius > 0.05) {
          onAddShape({
            type: 'circle',
            center_x: currentShape.center_x,
            center_y: currentShape.center_y,
            radius: currentShape.radius,
            x: currentShape.center_x,
            y: currentShape.center_y
          });
        }
      }
    }
    setIsDrawing(false);
    setCurrentShape(null);
    setStartPoint(null);
  };

  const addPresetShape = () => {
    if (tool === 'rectangle') {
      onAddShape({
        type: 'rectangle',
        x: 0.1,
        y: 0.25,
        width: width,
        height: height
      });
    } else {
      onAddShape({
        type: 'circle',
        center_x: 0.5,
        center_y: 0.5,
        radius: radius,
        x: 0.5,
        y: 0.5
      });
    }
  };

  return (
    <div>
      <Title level={5} style={{ marginBottom: 12 }}>绘制工具</Title>
      
      <Radio.Group value={tool} onChange={e => setTool(e.target.value)} style={{ marginBottom: 12 }}>
        <Radio.Button value="rectangle">矩形</Radio.Button>
        <Radio.Button value="circle">圆形</Radio.Button>
      </Radio.Group>

      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
        {tool === 'rectangle' ? (
          <Space>
            <span>宽:</span>
            <InputNumber
              value={width}
              onChange={setWidth}
              min={0.1}
              max={1}
              step={0.1}
              precision={2}
              style={{ width: 80 }}
            />
            <span>高:</span>
            <InputNumber
              value={height}
              onChange={setHeight}
              min={0.1}
              max={1}
              step={0.1}
              precision={2}
              style={{ width: 80 }}
            />
          </Space>
        ) : (
          <Space>
            <span>半径:</span>
            <InputNumber
              value={radius}
              onChange={setRadius}
              min={0.1}
              max={0.5}
              step={0.05}
              precision={2}
              style={{ width: 80 }}
            />
          </Space>
        )}
        <Button type="dashed" onClick={addPresetShape} block>
          添加预设形状
        </Button>
      </Space>

      <Title level={5} style={{ marginBottom: 12 }}>
        已添加形状 ({shapes.length})
      </Title>
      
      <div className="shape-list">
        {shapes.length === 0 ? (
          <Text type="secondary">请在画布上绘制或点击添加预设</Text>
        ) : (
          shapes.map((shape) => (
            <div key={shape.id} className="shape-item">
              <Space>
                <Tag color={shape.type === 'rectangle' ? 'blue' : 'green'}>
                  {shape.type === 'rectangle' ? '矩形' : '圆形'}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {shape.type === 'rectangle'
                    ? `${(shape.width * 100).toFixed(0)}×${(shape.height * 100).toFixed(0)}`
                    : `r=${(shape.radius * 100).toFixed(0)}`}
                </Text>
              </Space>
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={() => onRemoveShape(shape.id)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default GeometryCanvas;
