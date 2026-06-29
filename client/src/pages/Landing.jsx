import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useStore } from '../store/useStore.js';

export default function Landing() {
  const navigate = useNavigate();
  const setMe = useStore((s) => s.setMe);
  const setRoom = useStore((s) => s.setRoom);

  const [name, setName] = useState(localStorage.getItem('cb_name') || '');
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const persist = (token, user, room) => {
    sessionStorage.setItem('cb_token', token);
    localStorage.setItem('cb_name', user.name);
    setMe(user);
    setRoom(room);
  };

  const handleCreate = async () => {
    if (!name.trim()) return setErr('Enter your name');
    setBusy(true); setErr('');
    try {
      const { token, user, room } = await api.createRoom(roomName, name.trim());
      persist(token, user, room);
      navigate(`/r/${room.code}`);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const handleJoin = async () => {
    if (!name.trim()) return setErr('Enter your name');
    if (!joinCode.trim()) return setErr('Enter a room code');
    setBusy(true); setErr('');
    try {
      const code = joinCode.trim().toUpperCase();
      const { token, user, room } = await api.joinRoom(code, name.trim());
      persist(token, user, room);
      navigate(`/r/${room.code}`);
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="landing">
      <div className="landing-card">
        <div className="brand">
          <span className="logo">✦</span>
          <h1>CollabBoard</h1>
          <p>Real-time collaborative whiteboard. No signup — just a name and a code.</p>
        </div>

        <label className="field">
          <span>Your name</span>
          <input value={name} placeholder="e.g. Ada" onChange={(e) => setName(e.target.value)} />
        </label>

        <div className="split">
          <div className="panel">
            <h3>Create a board</h3>
            <input
              value={roomName}
              placeholder="Board name (optional)"
              onChange={(e) => setRoomName(e.target.value)}
            />
            <button className="primary" disabled={busy} onClick={handleCreate}>
              {busy ? '…' : 'Create board'}
            </button>
          </div>

          <div className="divider"><span>or</span></div>

          <div className="panel">
            <h3>Join a board</h3>
            <input
              value={joinCode}
              placeholder="Room code (e.g. BR-7F3K)"
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            />
            <button className="ghost" disabled={busy} onClick={handleJoin}>
              {busy ? '…' : 'Join board'}
            </button>
          </div>
        </div>

        {err && <p className="error">{err}</p>}
      </div>
      <footer className="landing-footer">Built to scale · React · Node · WebSockets · MongoDB</footer>
    </div>
  );
}
