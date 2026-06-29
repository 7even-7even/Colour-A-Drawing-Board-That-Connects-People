import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore.js';
import { api } from '../lib/api.js';
import Logo from './Logo.jsx';

const NAV = [
  { id: 'new', label: 'New Board', icon: '✛' },
  { id: 'boards', label: 'Past Boards', icon: '🗂️' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

// Local "Past Boards" history (no backend needed for MVP — stored client-side).
function loadHistory() {
  try { return JSON.parse(localStorage.getItem('cb_history') || '[]'); }
  catch { return []; }
}

export default function Sidebar() {
  const navigate = useNavigate();
  const open = useStore((s) => s.sidebarOpen);
  const setOpen = useStore((s) => s.setSidebarOpen);
  const me = useStore((s) => s.me);

  const [view, setView] = useState('boards');
  const [history, setHistory] = useState([]);

  useEffect(() => { if (open) setHistory(loadHistory()); }, [open, view]);

  const close = () => setOpen(false);

  const newBoard = async () => {
    try {
      const name = localStorage.getItem('cb_name') || 'Guest';
      const { token, user, room } = await api.createRoom('Untitled Board', name);
      sessionStorage.setItem('cb_token', token);
      useStore.getState().setMe(user);
      useStore.getState().setRoom(room);
      close();
      navigate(`/r/${room.code}`);
    } catch { /* ignore */ }
  };

  const openBoard = (code) => { close(); navigate(`/r/${code}`); };

  const goHome = () => { close(); navigate('/'); };

  return (
    <>
      <div className={`scrim ${open ? 'show' : ''}`} onClick={close} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="sidebar-head">
          <Logo size={26} />
          <button className="icon-btn" onClick={close} title="Close">✕</button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? 'active' : ''}`}
              onClick={() => (n.id === 'new' ? newBoard() : setView(n.id))}
            >
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-body">
          {view === 'boards' && (
            <Section title="Past Boards">
              {history.length === 0 ? (
                <Empty text="No boards yet. Create one!" />
              ) : (
                history.map((b) => (
                  <button key={b.code} className="list-row" onClick={() => openBoard(b.code)}>
                    <span className="list-dot" style={{ background: b.color || '#6366f1' }} />
                    <span className="list-main">
                      <strong>{b.name}</strong>
                      <small>{b.code} · {timeAgo(b.at)}</small>
                    </span>
                    <span className="list-go">→</span>
                  </button>
                ))
              )}
            </Section>
          )}

          {view === 'friends' && (
            <Section title="Friends">
              <Empty text="Friends list coming soon — invite people by sharing your room link." />
            </Section>
          )}

          {view === 'profile' && (
            <Section title="Profile">
              <div className="profile-card">
                <span className="avatar lg" style={{ background: me?.color || '#6366f1' }}>
                  {(me?.name || 'G').slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <strong>{me?.name || 'Guest'}</strong>
                  <small>{me?.userId || 'not signed in'}</small>
                </div>
              </div>
              <ProfileNameEditor />
            </Section>
          )}

          {view === 'settings' && (
            <Section title="Settings">
              <SettingsPanel />
            </Section>
          )}
        </div>

        <div className="sidebar-foot">
          <button className="ghost full" onClick={goHome}>Leave board</button>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section className="sb-section">
      <h4>{title}</h4>
      <div className="sb-section-body">{children}</div>
    </section>
  );
}
function Empty({ text }) { return <p className="empty">{text}</p>; }

function ProfileNameEditor() {
  const [name, setName] = useState(localStorage.getItem('cb_name') || '');
  const [saved, setSaved] = useState(false);
  const save = () => {
    if (!name.trim()) return;
    localStorage.setItem('cb_name', name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <div className="field-row">
      <label>Display name (used on next join)</label>
      <div className="row">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        <button className="primary sm" onClick={save}>{saved ? '✓' : 'Save'}</button>
      </div>
    </div>
  );
}

function SettingsPanel() {
  const [dark, setDark] = useState(localStorage.getItem('cb_theme') === 'dark');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('cb_theme', dark ? 'dark' : 'light');
  }, [dark]);
  return (
    <>
      <Toggle label="Dark canvas theme" checked={dark} onChange={setDark} />
      <p className="hint">More settings (grid, snap, export) coming soon.</p>
    </>
  );
}

function Toggle({ label, checked, onChange }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track"><span className="knob" /></span>
    </label>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
