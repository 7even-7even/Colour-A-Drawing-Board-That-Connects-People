import { useState } from 'react';
import { useStore } from '../store/useStore.js';

// Brush / freehand styles
const BRUSHES = [
  { id: 'pen', label: '✏️', title: 'Pen' },
  { id: 'marker', label: '🖊️', title: 'Marker (bold)' },
  { id: 'highlighter', label: '🖍️', title: 'Highlighter' },
  { id: 'calligraphy', label: '✒️', title: 'Calligraphy' },
  { id: 'spray', label: '💨', title: 'Spray' },
  { id: 'eraser', label: '🩹', title: 'Eraser' },
];

// Shapes
const SHAPES = [
  { id: 'line', label: '╱', title: 'Line' },
  { id: 'arrow', label: '➤', title: 'Arrow' },
  { id: 'rect', label: '▭', title: 'Rectangle' },
  { id: 'ellipse', label: '◯', title: 'Ellipse' },
  { id: 'diamond', label: '◇', title: 'Diamond' },
  { id: 'triangle', label: '△', title: 'Triangle' },
  { id: 'star', label: '★', title: 'Star' },
  { id: 'text', label: 'T', title: 'Text' },
];

const SHAPE_IDS = SHAPES.map((s) => s.id).filter((id) => id !== 'text');

const COLORS = [
  '#111827', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#10b981', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

export default function Toolbar({ onClear }) {
  const {
    tool, setTool, color, setColor, width, setWidth,
    opacity, setOpacity, fillShapes, setFillShapes,
  } = useStore();
  const [open, setOpen] = useState(true);
  const showFill = SHAPE_IDS.includes(tool);

  return (
    <div className={`toolbar ${open ? '' : 'collapsed'}`}>
      <button className="toolbar-toggle" onClick={() => setOpen((o) => !o)} title="Toggle tools">
        {open ? '▾' : '▸'}
      </button>

      {open && (
        <div className="toolbar-inner">
          <div className="tool-group" role="group" aria-label="Brushes">
            {BRUSHES.map((t) => (
              <button
                key={t.id}
                title={t.title}
                className={`tool ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="tool-sep" />

          <div className="tool-group" role="group" aria-label="Shapes">
            {SHAPES.map((t) => (
              <button
                key={t.id}
                title={t.title}
                className={`tool ${tool === t.id ? 'active' : ''}`}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span className="tool-sep" />

          <div className="tool-group swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`swatch ${color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
            <label className="custom-color" title="Custom color">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              <span style={{ background: color }} />
            </label>
          </div>

          <span className="tool-sep" />

          <div className="tool-group sliders">
            <label className="slider" title="Size">
              <span>◍</span>
              <input type="range" min="1" max="40" value={width}
                onChange={(e) => setWidth(Number(e.target.value))} />
            </label>
            <label className="slider" title="Opacity">
              <span>◐</span>
              <input type="range" min="10" max="100" value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)} />
            </label>
            {showFill && (
              <button
                className={`tool ${fillShapes ? 'active' : ''}`}
                title="Fill shape"
                onClick={() => setFillShapes(!fillShapes)}
              >
                ⬛
              </button>
            )}
          </div>

          <span className="tool-sep" />

          <button className="tool danger" title="Clear board" onClick={onClear}>🗑️</button>
        </div>
      )}
    </div>
  );
}
