import { useEffect, useRef, useState } from 'react';
import {
  Stage, Layer, Line, Rect, Ellipse, Text, Image as KImage,
  Arrow, RegularPolygon, Star, Circle,
} from 'react-konva';
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

// Renders one committed/draft stroke
function renderStroke(s, i) {
  const key = s.clientStrokeId || s._id || i;
  const d = s.data || {};
  const opacity = d.opacity ?? 1;
  const fillProps = d.fill ? { fill: d.color } : {};

  switch (s.type) {
    case 'pen':
    case 'path':
      return (
        <Line key={key} points={d.points} stroke={d.color} strokeWidth={d.width}
          lineCap="round" lineJoin="round" tension={0.4} opacity={opacity} />
      );
    case 'marker':
      return (
        <Line key={key} points={d.points} stroke={d.color} strokeWidth={d.width}
          lineCap="round" lineJoin="round" tension={0.3} opacity={opacity} />
      );
    case 'highlighter':
      return (
        <Line key={key} points={d.points} stroke={d.color} strokeWidth={d.width}
          lineCap="round" lineJoin="round" tension={0.2} opacity={0.35}
          globalCompositeOperation="multiply" />
      );
    case 'calligraphy':
      return (
        <Line key={key} points={d.points} stroke={d.color} strokeWidth={d.width}
          lineCap="square" lineJoin="bevel" tension={0.5} opacity={opacity} />
      );
    case 'spray':
      return (
        <Line key={key} points={d.points} stroke={d.color} strokeWidth={d.width}
          lineCap="round" lineJoin="round" tension={0} opacity={0.25} dash={[1, 6]} />
      );
    case 'erase':
      return (
        <Line key={key} points={d.points} stroke="#ffffff" strokeWidth={d.width}
          lineCap="round" lineJoin="round" tension={0.4}
          globalCompositeOperation="destination-out" />
      );
    case 'line':
      return (
        <Line key={key} points={[d.x, d.y, d.x + d.w, d.y + d.h]} stroke={d.color}
          strokeWidth={d.width} lineCap="round" opacity={opacity} />
      );
    case 'arrow':
      return (
        <Arrow key={key} points={[d.x, d.y, d.x + d.w, d.y + d.h]} stroke={d.color}
          fill={d.color} strokeWidth={d.width} pointerLength={10 + d.width}
          pointerWidth={10 + d.width} opacity={opacity} />
      );
    case 'rect':
      return (
        <Rect key={key} x={d.x} y={d.y} width={d.w} height={d.h} stroke={d.color}
          strokeWidth={d.width} cornerRadius={4} opacity={opacity} {...fillProps} />
      );
    case 'ellipse':
      return (
        <Ellipse key={key} x={d.x + d.w / 2} y={d.y + d.h / 2}
          radiusX={Math.abs(d.w / 2)} radiusY={Math.abs(d.h / 2)} stroke={d.color}
          strokeWidth={d.width} opacity={opacity} {...fillProps} />
      );
    case 'diamond':
      return (
        <RegularPolygon key={key} x={d.x + d.w / 2} y={d.y + d.h / 2} sides={4}
          radius={Math.max(Math.abs(d.w), Math.abs(d.h)) / 2} rotation={0}
          stroke={d.color} strokeWidth={d.width} opacity={opacity} {...fillProps} />
      );
    case 'triangle':
      return (
        <RegularPolygon key={key} x={d.x + d.w / 2} y={d.y + d.h / 2} sides={3}
          radius={Math.max(Math.abs(d.w), Math.abs(d.h)) / 2}
          stroke={d.color} strokeWidth={d.width} opacity={opacity} {...fillProps} />
      );
    case 'star':
      return (
        <Star key={key} x={d.x + d.w / 2} y={d.y + d.h / 2} numPoints={5}
          innerRadius={Math.max(Math.abs(d.w), Math.abs(d.h)) / 4}
          outerRadius={Math.max(Math.abs(d.w), Math.abs(d.h)) / 2}
          stroke={d.color} strokeWidth={d.width} opacity={opacity} {...fillProps} />
      );
    case 'text':
      return <Text key={key} x={d.x} y={d.y} text={d.text} fontSize={d.fontSize || 22} fill={d.color} opacity={opacity} />;
    case 'image':
      return <ImageStroke key={key} s={s} />;
    default:
      return null;
  }
}

const FREEHAND = ['pen', 'marker', 'highlighter', 'calligraphy', 'spray', 'eraser'];
const WIDTH_MULT = { marker: 2.2, highlighter: 3.5, calligraphy: 1.6, spray: 1.4, eraser: 3 };

export default function Whiteboard({ strokes, cursors, commitStroke, sendCursor }) {
  const { tool, color, width, opacity, fillShapes } = useStore();

  const wrapRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [draft, setDraft] = useState(null);
  const drawing = useRef(false);
  const lastCursor = useRef(0);

  // Size the Stage to its CONTAINER (fixes overflow over chat panel)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.max(1, r.width), h: Math.max(1, r.height) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const pos = (e) => e.target.getStage().getPointerPosition();

  const handleDown = (e) => {
    const p = pos(e);
    drawing.current = true;
    const w = width * (WIDTH_MULT[tool] || 1);

    if (FREEHAND.includes(tool)) {
      const type = tool === 'eraser' ? 'erase' : tool;
      setDraft({ type, data: { points: [p.x, p.y], color, width: w, opacity } });
    } else if (tool === 'text') {
      drawing.current = false;
      const text = window.prompt('Text:');
      if (text) commitStroke('text', { x: p.x, y: p.y, text, color, fontSize: 22, opacity });
    } else {
      // shapes
      setDraft({ type: tool, data: { x: p.x, y: p.y, w: 0, h: 0, color, width, opacity, fill: fillShapes } });
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
    if (FREEHAND.includes(draft.type) || draft.type === 'erase') {
      setDraft((d) => ({ ...d, data: { ...d.data, points: [...d.data.points, p.x, p.y] } }));
    } else {
      setDraft((d) => ({ ...d, data: { ...d.data, w: p.x - d.data.x, h: p.y - d.data.y } }));
    }
  };

  const handleUp = () => {
    if (!drawing.current || !draft) { drawing.current = false; return; }
    drawing.current = false;
    const { type, data } = draft;
    const isFree = FREEHAND.includes(type) || type === 'erase';
    const trivial = isFree ? data.points.length < 4 : Math.abs(data.w) < 3 && Math.abs(data.h) < 3;
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
        onMouseLeave={handleUp}
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
            <Cursor key={id} c={c} />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function Cursor({ c }) {
  return (
    <>
      <Circle x={c.x} y={c.y} radius={4} fill={c.color} />
      <Text x={c.x + 8} y={c.y + 6} text={c.name} fontSize={12} fill={c.color}
        fontStyle="bold" />
    </>
  );
}
