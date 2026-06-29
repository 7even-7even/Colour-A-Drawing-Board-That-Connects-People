import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat.js';
import { useStore } from '../store/useStore.js';
import { api } from '../lib/api.js';

export default function ChatPanel({ code, open, onClose, onUnreadChange }) {
  const { messages, sendText, sendFile } = useChat();
  const me = useStore((s) => s.me);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);
  const lastCount = useRef(messages.length);

  // Auto-scroll + unread tracking
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    const added = messages.length - lastCount.current;
    if (added > 0 && !open && onUnreadChange) {
      onUnreadChange((u) => (typeof u === 'number' ? u + added : added));
    }
    lastCount.current = messages.length;
  }, [messages.length, open]);

  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    sendText(t);
    setText('');
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadFile(code, file);
      sendFile(res);
    } catch {
      alert('Upload failed. Try a smaller file.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <aside className={`chat-panel ${open ? 'open' : ''}`}>
      <div className="chat-header">
        <span>Chat &amp; Files</span>
        <button className="icon-btn chat-close" onClick={onClose} title="Close chat">✕</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet. Say hi 👋</p>
        )}
        {messages.map((m) => (
          <div key={m._id} className={`msg ${m.kind} ${m.authorId === me?.userId ? 'mine' : ''}`}>
            {m.kind !== 'system' && m.authorId !== me?.userId && (
              <span className="msg-author">{m.authorName}</span>
            )}
            {m.kind === 'file' ? <FileMessage m={m} /> : <span className="msg-text">{m.text}</span>}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form className="chat-input" onSubmit={submit}>
        <button
          type="button"
          className="attach"
          title="Share a file"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '…' : '📎'}
        </button>
        <input ref={fileRef} type="file" hidden onChange={onFile} />
        <input
          className="chat-text"
          value={text}
          placeholder="Message…"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="send" disabled={!text.trim()}>Send</button>
      </form>
    </aside>
  );
}

function FileMessage({ m }) {
  const url = api.fileUrl(m.fileId);
  const isImage = (m.contentType || '').startsWith('image/');
  return (
    <a className="file-msg" href={url} target="_blank" rel="noreferrer">
      {isImage ? (
        <img src={url} alt={m.originalName} className="file-thumb" />
      ) : (
        <span className="file-doc">📄 {m.originalName}</span>
      )}
    </a>
  );
}
