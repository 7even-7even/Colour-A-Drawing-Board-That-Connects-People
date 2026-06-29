import { useStore } from '../store/useStore.js';

const TOOLS = [
  { id: 'pen', label: '✏️', title: 'Pen' },
  { id: 'eraser', label: '🩹', title: 'Eraser' },
  { id: 'rect', label: '▭', title: 'Rectangle' },
  { id: 'ellipse', label: '◯', title: 'Ellipse' },
  { id: 'text', label: 'T', title: 'Text' },
];

const COLORS = ['#111827', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

export default function Toolbar({ onClear }) {
  const { tool, setTool, color, setColor, width, setWidth } = useStore();

  return (
    <div className="toolbar">
      <div className="tool-group">
        {TOOLS.map((t) => (
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

      <div className="tool-group">
        {COLORS.map((c) => (
          <button
            key={c}
            className={`swatch ${color === c ? 'active' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
          />
        ))}
      </div>

      <div className="tool-group">
        <input
          type="range"
          min="1"
          max="24"
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          title="Stroke width"
        />
      </div>

      <button className="tool danger" title="Clear board" onClick={onClear}>🗑️</button>
    </div>
  );
}
