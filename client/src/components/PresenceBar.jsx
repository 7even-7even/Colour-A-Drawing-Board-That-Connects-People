import { useState } from 'react';
import { useStore } from '../store/useStore.js';
import Logo from './Logo.jsx';

export default function PresenceBar({ code, name }) {
  const users = useStore((s) => s.users);
  const connected = useStore((s) => s.connected);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <header className="presence-bar">
      <div className="pb-left">
        <button className="hamburger" onClick={toggleSidebar} title="Menu" aria-label="Open menu">
          <span /><span /><span />
        </button>
        <Logo size={24} />
        <span className="pb-divider" />
        <strong className="board-name">{name}</strong>
        <button className="code-chip" onClick={copy} title="Copy invite link">
          {code} <span className="copy">{copied ? 'copied!' : 'copy link'}</span>
        </button>
        <span className={`status ${connected ? 'on' : 'off'}`}>
          {connected ? 'live' : 'connecting…'}
        </span>
      </div>
      <div className="pb-right">
        <div className="avatars">
          {users.slice(0, 6).map((u) => (
            <span key={u.userId} className="avatar" style={{ background: u.color }} title={u.name}>
              {u.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
          {users.length > 6 && <span className="avatar more">+{users.length - 6}</span>}
        </div>
        <span className="count">{users.length} online</span>
      </div>
    </header>
  );
}
