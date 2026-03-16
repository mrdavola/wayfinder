import { useRef, useState, useEffect, useCallback } from 'react';
import { Pen, Eraser, Undo2, Redo2, Trash2 } from 'lucide-react';

const COLORS = [
  '#1a1a1a',
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
];

const SIZES = [
  { label: 'S', value: 2 },
  { label: 'M', value: 5 },
  { label: 'L', value: 12 },
];

export default function SketchPad({ onSave }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawing = useRef(false);
  const currentStroke = useRef(null);
  const saveTimerRef = useRef(null);

  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#1a1a1a');
  const [size, setSize] = useState(5);
  const [strokes, setStrokes] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 400 });

  // Redraw all strokes onto canvas
  const redrawCanvas = useCallback((strokeList) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokeList) {
      if (stroke.points.length < 2) continue;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = stroke.width;

      if (stroke.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = stroke.color;
      }

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  }, []);

  // Debounced auto-save
  const scheduleSave = useCallback((strokeList) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas || !onSave) return;
      const imageData = canvas.toDataURL('image/png');
      onSave({ imageData, strokes: strokeList });
    }, 1000);
  }, [onSave]);

  // Resize canvas to container width
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        setCanvasSize({ width: w, height: 400 });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Redraw when canvas size changes
  useEffect(() => {
    // Need a small delay so the canvas element updates its width/height attributes first
    const frame = requestAnimationFrame(() => redrawCanvas(strokes));
    return () => cancelAnimationFrame(frame);
  }, [canvasSize, strokes, redrawCanvas]);

  // Get point from mouse or touch event relative to canvas
  const getPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startStroke = (e) => {
    e.preventDefault();
    isDrawing.current = true;
    if (!hasDrawn) setHasDrawn(true);
    const pt = getPoint(e);
    currentStroke.current = {
      points: [pt],
      color: color,
      width: tool === 'eraser' ? size * 3 : size,
      tool: tool,
    };
  };

  const continueStroke = (e) => {
    e.preventDefault();
    if (!isDrawing.current || !currentStroke.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const pt = getPoint(e);
    const prev = currentStroke.current.points[currentStroke.current.points.length - 1];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = currentStroke.current.width;

    if (currentStroke.current.tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = currentStroke.current.color;
    }

    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    currentStroke.current.points.push(pt);
  };

  const endStroke = (e) => {
    e.preventDefault();
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;

    const finished = currentStroke.current;
    currentStroke.current = null;

    if (finished.points.length >= 2) {
      setStrokes((prev) => {
        const next = [...prev, finished];
        scheduleSave(next);
        return next;
      });
      setRedoStack([]);
    }
  };

  const handleUndo = () => {
    setStrokes((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setRedoStack((r) => [...r, last]);
      const next = prev.slice(0, -1);
      redrawCanvas(next);
      scheduleSave(next);
      return next;
    });
  };

  const handleRedo = () => {
    setRedoStack((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      setStrokes((s) => {
        const next = [...s, last];
        redrawCanvas(next);
        scheduleSave(next);
        return next;
      });
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setStrokes([]);
    setRedoStack([]);
    setHasDrawn(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    scheduleSave([]);
  };

  // Toolbar button style helper
  const tbBtn = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 36,
    minHeight: 36,
    padding: '4px 10px',
    border: active ? '2px solid var(--ink)' : '1.5px solid var(--pencil)',
    borderRadius: 8,
    background: active ? 'var(--paper)' : 'transparent',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontSize: 12,
    fontWeight: active ? 700 : 500,
    color: 'var(--ink)',
    boxShadow: active ? '0 0 0 2px var(--compass-gold)' : 'none',
    transition: 'all 0.15s',
  });

  return (
    <div ref={containerRef} style={{ marginBottom: 8 }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        background: 'var(--parchment)',
        padding: '8px 12px',
        borderRadius: '8px 8px 0 0',
        border: '1px solid var(--pencil)',
        borderBottom: 'none',
      }}>
        {/* Tools */}
        <button style={tbBtn(tool === 'pen')} onClick={() => setTool('pen')} title="Pen">
          <Pen size={16} /> Pen
        </button>
        <button style={tbBtn(tool === 'eraser')} onClick={() => setTool('eraser')} title="Eraser">
          <Eraser size={16} /> Eraser
        </button>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--pencil)', margin: '0 4px' }} />

        {/* Colors */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setTool('pen'); }}
              title={c}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: c,
                border: color === c && tool === 'pen' ? '2.5px solid var(--ink)' : '2px solid var(--pencil)',
                cursor: 'pointer',
                boxShadow: color === c && tool === 'pen' ? '0 0 0 2px var(--compass-gold)' : 'none',
                transition: 'all 0.15s',
                padding: 0,
                flexShrink: 0,
              }}
            />
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--pencil)', margin: '0 4px' }} />

        {/* Sizes */}
        <div style={{ display: 'flex', gap: 4 }}>
          {SIZES.map((s) => (
            <button
              key={s.label}
              onClick={() => setSize(s.value)}
              style={tbBtn(size === s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'var(--pencil)', margin: '0 4px' }} />

        {/* Actions */}
        <button
          style={{ ...tbBtn(false), opacity: strokes.length === 0 ? 0.4 : 1 }}
          onClick={handleUndo}
          disabled={strokes.length === 0}
          title="Undo"
        >
          <Undo2 size={16} />
        </button>
        <button
          style={{ ...tbBtn(false), opacity: redoStack.length === 0 ? 0.4 : 1 }}
          onClick={handleRedo}
          disabled={redoStack.length === 0}
          title="Redo"
        >
          <Redo2 size={16} />
        </button>
        <button
          style={{ ...tbBtn(false), opacity: strokes.length === 0 ? 0.4 : 1 }}
          onClick={handleClear}
          disabled={strokes.length === 0}
          title="Clear"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Canvas container */}
      <div style={{ position: 'relative', borderRadius: '0 0 8px 8px', overflow: 'hidden', border: '1px solid var(--pencil)' }}>
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            display: 'block',
            width: '100%',
            height: 400,
            background: '#ffffff',
            cursor: tool === 'eraser' ? 'cell' : 'crosshair',
            touchAction: 'none',
          }}
          onMouseDown={startStroke}
          onMouseMove={continueStroke}
          onMouseUp={endStroke}
          onMouseLeave={endStroke}
          onTouchStart={startStroke}
          onTouchMove={continueStroke}
          onTouchEnd={endStroke}
        />
        {/* Hint text */}
        {!hasDrawn && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'var(--pencil)',
            fontFamily: 'var(--font-body)',
            fontSize: 18,
            fontWeight: 500,
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: 0.5,
          }}>
            Draw here!
          </div>
        )}
      </div>
    </div>
  );
}
