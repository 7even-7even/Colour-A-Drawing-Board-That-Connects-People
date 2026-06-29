import { useStore } from '../store/useStore.js';

export default function PresenceBar({ code, name }) {
  const users = useStore((s) => s.users);
  const connected = useStore((s) => s.connected);

  const copy = () => {
    const url = `${window.location.origin}/r/${code}`;
    navigator.clipboard?.writeText(url);
  };

  return (
    <header className="presence-bar">
      <div className="pb-left">
        <span className="logo">✦</span>
        <strong>{name}</strong>
        <button className="code-chip" onClick={copy} title="Copy invite link">
          {code} <span className="copy">copy link</span>
        </button>
        <span className={`status ${connected ? 'on' : 'off'}`}>
          {connected ? 'live' : 'connecting…'}
        </span>
      </div>
      <div className="pb-right">
        <div className="avatars">
          {users.map((u) => (
            <span key={u.userId} className="avatar" style={{ background: u.color }} title={u.name}>
              {u.name.slice(0, 1).toUpperCase()}
            </span>
          ))}
        </div>
        <span className="count">{users.length} online</span>
      </div>
    </header>
  );
}
