import { useEffect, useRef, useState } from 'react';
import { useChat } from '../hooks/useChat.js';
import { useStore } from '../store/useStore.js';
import { api } from '../lib/api.js';

export default function ChatPanel({ code }) {
  const { messages, sendText, sendFile } = useChat();
  const me = useStore((s) => s.me);
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const submit = (e) => {
    e.preventDefault();
    sendText(text);
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
      /* ignore for MVP */
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <aside className="chat-panel">
      <div className="chat-header">Chat & Files</div>
      <div className="chat-messages">
        {messages.map((m) => (
          <div
            key={m._id}
            className={`msg ${m.kind} ${m.authorId === me?.userId ? 'mine' : ''}`}
          >
            {m.kind !== 'system' && <span className="msg-author">{m.authorName}</span>}
            {m.kind === 'file' ? (
              <FileMessage m={m} />
            ) : (
              <span className="msg-text">{m.text}</span>
            )}
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
          value={text}
          placeholder="Message…"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="send">Send</button>
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
