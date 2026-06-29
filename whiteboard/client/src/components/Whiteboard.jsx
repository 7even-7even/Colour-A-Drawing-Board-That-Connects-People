import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Line, Rect, Ellipse, Text, Image as KImage } from 'react-konva';
import { useStore } from '../store/useStore.js';
import { api } from '../lib/api.js';

// Loads an image fileId into an HTMLImageElement for Konva.
function useImageEl(fileId) {
  const [img, setImg] = useState(null);
  useEffect(() => {
    if (!fileId) return;
    const el = new window.Image();
    el.crossOrigin = 'anonymous';
    el.src = api.fileUrl(fileId);
    el.onload = () => setImg(el);
  }, [fileId]);
  return img;
}

function ImageStroke({ s }) {
  const img = useImageEl(s.data.fileId);
  if (!img) return null;
  return <KImage image={img} x={s.data.x} y={s.data.y} width={s.data.w} height={s.data.h} />;
}

function renderStroke(s, i) {
  const key = s.clientStrokeId || s._id || i;
  const d = s.data || {};
  switch (s.type) {
    case 'path':
    case 'erase':
      return (
        <Line
          key={key}
          points={d.points}
          stroke={s.type === 'erase' ? '#ffffff' : d.color}
          strokeWidth={d.width}
          lineCap="round"
          lineJoin="round"
          tension={0.4}
          globalCompositeOperation={s.type === 'erase' ? 'destination-out' : 'source-over'}
        />
      );
    case 'rect':
      return <Rect key={key} x={d.x} y={d.y} width={d.w} height={d.h} stroke={d.color} strokeWidth={d.width} />;
    case 'ellipse':
      return (
        <Ellipse key={key} x={d.x + d.w / 2} y={d.y + d.h / 2} radiusX={Math.abs(d.w / 2)} radiusY={Math.abs(d.h / 2)} stroke={d.color} strokeWidth={d.width} />
      );
    case 'text':
      return <Text key={key} x={d.x} y={d.y} text={d.text} fontSize={d.fontSize || 20} fill={d.color} />;
    case 'image':
      return <ImageStroke key={key} s={s} />;
    default:
      return null;
  }
}

export default function Whiteboard({ strokes, cursors, commitStroke, sendCursor }) {
  const tool = useStore((s) => s.tool);
  const color = useStore((s) => s.color);
  const width = useStore((s) => s.width);

  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [draft, setDraft] = useState(null); // in-progress shape
  const drawing = useRef(false);
  const lastCursor = useRef(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    const onResize = () => {
      if (!wrapRef.current) return;
      const r = wrapRef.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const pos = (e) => {
    const stage = e.target.getStage();
    return stage.getPointerPosition();
  };

  const handleDown = (e) => {
    const p = pos(e);
    drawing.current = true;
    if (tool === 'pen' || tool === 'eraser') {
      setDraft({ type: tool === 'eraser' ? 'erase' : 'path', data: { points: [p.x, p.y], color, width: tool === 'eraser' ? width * 3 : width } });
    } else if (tool === 'rect' || tool === 'ellipse') {
      setDraft({ type: tool, data: { x: p.x, y: p.y, w: 0, h: 0, color, width } });
    } else if (tool === 'text') {
      const text = window.prompt('Text:');
      drawing.current = false;
      if (text) commitStroke('text', { x: p.x, y: p.y, text, color, fontSize: 22 });
    }
  };

  const handleMove = (e) => {
    const p = pos(e);
    const now = Date.now();
    if (now - lastCursor.current > 45) {
      lastCursor.current = now;
      sendCursor(p.x, p.y);
    }
    if (!drawing.current || !draft) return;
    if (draft.type === 'path' || draft.type === 'erase') {
      setDraft((d) => ({ ...d, data: { ...d.data, points: [...d.data.points, p.x, p.y] } }));
    } else {
      setDraft((d) => ({ ...d, data: { ...d.data, w: p.x - d.data.x, h: p.y - d.data.y } }));
    }
  };

  const handleUp = () => {
    if (!drawing.current || !draft) { drawing.current = false; return; }
    drawing.current = false;
    const { type, data } = draft;
    const trivial =
      (type === 'path' || type === 'erase') ? data.points.length < 4
      : Math.abs(data.w) < 3 && Math.abs(data.h) < 3;
    if (!trivial) commitStroke(type, data);
    setDraft(null);
  };

  return (
    <div className="canvas-wrap" ref={wrapRef}>
      <Stage
        width={size.w}
        height={size.h}
        onMouseDown={handleDown}
        onMouseMove={handleMove}
        onMouseUp={handleUp}
        onTouchStart={handleDown}
        onTouchMove={handleMove}
        onTouchEnd={handleUp}
      >
        <Layer>
          {strokes.map(renderStroke)}
          {draft && renderStroke(draft, 'draft')}
        </Layer>
        <Layer listening={false}>
          {Object.entries(cursors).map(([id, c]) => (
            <Text key={id} x={c.x + 8} y={c.y + 8} text={c.name} fontSize={12} fill={c.color} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
