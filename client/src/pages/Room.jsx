import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, disconnectSocket, getSocket } from '../lib/socket.js';
import { api } from '../lib/api.js';
import { useStore } from '../store/useStore.js';
import { useWhiteboard } from '../hooks/useWhiteboard.js';
import Whiteboard from '../components/Whiteboard.jsx';
import Toolbar from '../components/Toolbar.jsx';
import ChatPanel from '../components/ChatPanel.jsx';
import PresenceBar from '../components/PresenceBar.jsx';

export default function Room() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { me, room, setMe, setRoom, setUsers, setConnected, setMessages, reset } = useStore();

  // Ensure we have a token; if a user lands on a deep link without one, join as guest.
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!sessionStorage.getItem('cb_token')) {
        const name = localStorage.getItem('cb_name') || 'Guest';
        try {
          const { token, user, room } = await api.joinRoom(code, name);
          sessionStorage.setItem('cb_token', token);
          if (!alive) return;
          setMe(user);
          setRoom(room);
        } catch {
          navigate('/');
          return;
        }
      }
      // hydrate messages from snapshot
      try {
        const snap = await api.snapshot(code);
        if (alive) {
          setMessages(snap.messages || []);
          setRoom(snap.room);
        }
      } catch { /* socket still attempts */ }
    })();
    return () => { alive = false; };
  }, [code]);

  // Socket lifecycle
  useEffect(() => {
    const socket = connectSocket();

    const onConnect = () => {
      setConnected(true);
      socket.emit('room:join', { code });
    };
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
        <ChatPanel code={code} />
      </div>
    </div>
  );
}
