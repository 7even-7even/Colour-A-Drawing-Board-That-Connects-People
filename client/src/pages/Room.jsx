import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket } from '../lib/socket.js';
import { api } from '../lib/api.js';
import { useStore } from '../store/useStore.js';
import { useWhiteboard } from '../hooks/useWhiteboard.js';
import Whiteboard from '../components/Whiteboard.jsx';
import Toolbar from '../components/Toolbar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import PresenceBar from '../components/PresenceBar.jsx';
import Sidebar from '../components/Sidebar.jsx';

// Persist this board into local history (powers the sidebar "Past Boards").
function recordHistory(room, color) {
  try {
    const hist = JSON.parse(localStorage.getItem('cb_history') || '[]');
    const filtered = hist.filter((b) => b.code !== room.code);
    filtered.unshift({ code: room.code, name: room.name || 'Untitled Board', at: Date.now(), color });
    localStorage.setItem('cb_history', JSON.stringify(filtered.slice(0, 30)));
  } catch { /* ignore */ }
}

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { room, setMe, setRoom, setUsers, setConnected, setMessages, reset } = useStore();
  const [chatOpen, setChatOpen] = useState(false); // mobile drawer
  const [unread, setUnread] = useState(0);

  // Ensure a token; hydrate snapshot.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sessionStorage.getItem('cb_token')) {
        const name = localStorage.getItem('cb_name') || 'Guest';
        try {
          const res = await api.joinRoom(code, name);
          sessionStorage.setItem('cb_token', res.token);
          if (!alive) return;
          setMe(res.user);
          setRoom(res.room);
        } catch {
          navigate('/');
          return;
        }
      }
      try {
        const snap = await api.snapshot(code);
        if (alive) {
          setMessages(snap.messages || []);
          setRoom(snap.room);
          recordHistory(snap.room, useStore.getState().me?.color);
        }
      } catch { /* socket will retry */ }
    })();
    return () => { alive = false; };
  }, [code]);

  // Socket lifecycle
  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => { setConnected(true); socket.emit('room:join', { code }); };
    const onDisconnect = () => setConnected(false);
    const onState = ({ users }) => setUsers(users);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:state', onState);
    if (socket.connected) onConnect();

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:state', onState);
      disconnectSocket();
      reset();
    };
  }, [code]);

  const { strokes, cursors, commitStroke, clearBoard, sendCursor } = useWhiteboard(code);

  const handleClear = () => {
    if (window.confirm('Clear the board for everyone?')) clearBoard();
  };

  return (
    <div className="room">
      <Sidebar />
      <PresenceBar code={code} name={room?.name || 'Board'} />

      <div className="room-body">
        <div className="board-area">
          <Toolbar onClear={handleClear} />
          <Whiteboard
            strokes={strokes}
            cursors={cursors}
            commitStroke={commitStroke}
            sendCursor={sendCursor}
          />
        </div>

        <ChatPanel
          code={code}
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          onUnreadChange={setUnread}
        />
      </div>

      {/* Floating chat button (mobile) */}
      <button
        className="chat-fab"
        onClick={() => { setChatOpen((o) => !o); setUnread(0); }}
        title="Chat"
      >
        💬{unread > 0 && <span className="badge">{unread}</span>}
      </button>
    </div>
  );
}
