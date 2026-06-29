import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../lib/socket.js';
import { api } from '../lib/api.js';

// Generates a unique client stroke id for idempotency.
function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Manages committed strokes + remote cursors and the socket wiring.
 * Strokes are kept in React state (committed) but the in-progress stroke is
 * handled by the Whiteboard component locally for performance.
 */
export function useWhiteboard(code) {
  const [strokes, setStrokes] = useState([]);
  const [cursors, setCursors] = useState({}); // userId -> {x,y,name,color}
  const seenIds = useRef(new Set());

  // Hydrate the board from the snapshot, then subscribe to the live stream.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const snap = await api.snapshot(code);
        if (!alive) return;
        const committed = applyStrokes([], snap.strokes || []);
        committed.forEach((s) => seenIds.current.add(s.clientStrokeId));
        setStrokes(committed);
      } catch {
        /* room socket will still try */
      }
    })();
    return () => { alive = false; };
  }, [code]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onAdded = (stroke) => {
      if (seenIds.current.has(stroke.clientStrokeId)) return;
      seenIds.current.add(stroke.clientStrokeId);
      if (stroke.type === 'clear') {
        setStrokes([]);
        seenIds.current = new Set([stroke.clientStrokeId]);
        return;
      }
      setStrokes((prev) => [...prev, stroke]);
    };
    const onCleared = () => setStrokes([]);
    const onCursor = ({ userId, name, color, x, y }) =>
      setCursors((prev) => ({ ...prev, [userId]: { name, color, x, y, t: Date.now() } }));
    const onLeft = ({ user }) =>
      setCursors((prev) => {
        const next = { ...prev };
        delete next[user.userId];
        return next;
      });

    socket.on('stroke:added', onAdded);
    socket.on('board:cleared', onCleared);
    socket.on('cursor:moved', onCursor);
    socket.on('user:left', onLeft);

    return () => {
      socket.off('stroke:added', onAdded);
      socket.off('board:cleared', onCleared);
      socket.off('cursor:moved', onCursor);
      socket.off('user:left', onLeft);
    };
  }, []);

  // Stale-cursor cleanup
  useEffect(() => {
    const t = setInterval(() => {
      setCursors((prev) => {
        const now = Date.now();
        const next = {};
        for (const [k, v] of Object.entries(prev)) if (now - v.t < 5000) next[k] = v;
        return next;
      });
    }, 2000);
    return () => clearInterval(t);
  }, []);

  // Commit a finished stroke: optimistic local add + emit.
  const commitStroke = useCallback((type, data) => {
    const socket = getSocket();
    const clientStrokeId = uid();
    const optimistic = { clientStrokeId, type, data, _optimistic: true };
    seenIds.current.add(clientStrokeId);
    setStrokes((prev) => [...prev, optimistic]);
    socket?.emit('stroke:add', { clientStrokeId, type, data });
  }, []);

  const clearBoard = useCallback(() => {
    getSocket()?.emit('stroke:clear');
    setStrokes([]);
  }, []);

  const sendCursor = useCallback((x, y) => {
    getSocket()?.emit('cursor:move', { x, y });
  }, []);

  return { strokes, cursors, commitStroke, clearBoard, sendCursor };
}

// Folds a stroke log into a render list, honoring the latest "clear".
function applyStrokes(base, log) {
  let out = [...base];
  for (const s of log) {
    if (s.type === 'clear') out = [];
    else out.push(s);
  }
  return out;
}
