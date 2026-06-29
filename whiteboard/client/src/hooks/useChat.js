import { useEffect } from 'react';
import { getSocket } from '../lib/socket.js';
import { useStore } from '../store/useStore.js';

export function useChat() {
  const messages = useStore((s) => s.messages);
  const addMessage = useStore((s) => s.addMessage);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onMsg = (m) => addMessage(m);
    socket.on('chat:message', onMsg);
    return () => socket.off('chat:message', onMsg);
  }, [addMessage]);

  const sendText = (text) => {
    const t = text.trim();
    if (t) getSocket()?.emit('chat:send', { text: t });
  };

  const sendFile = ({ fileId, originalName, contentType }) => {
    getSocket()?.emit('chat:file', { fileId, originalName, contentType });
  };

  return { messages, sendText, sendFile };
}
