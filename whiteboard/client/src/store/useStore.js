import { create } from 'zustand';

export const useStore = create((set) => ({
  me: null, // { userId, name, color }
  room: null, // { id, code, name }
  users: [],
  messages: [],
  tool: 'pen', // pen | eraser | rect | ellipse | text
  color: '#111827',
  width: 4,
  connected: false,

  setMe: (me) => set({ me }),
  setRoom: (room) => set({ room }),
  setUsers: (users) => set({ users }),
  setConnected: (connected) => set({ connected }),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),

  setMessages: (messages) => set({ messages }),
  addMessage: (m) =>
    set((s) => (s.messages.some((x) => x._id === m._id) ? s : { messages: [...s.messages, m] })),

  reset: () => set({ room: null, users: [], messages: [], connected: false }),
}));
