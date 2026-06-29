import { create } from 'zustand';

export const useStore = create((set) => ({
  me: null, // { userId, name, color }
  room: null, // { id, code, name }
  users: [],
  messages: [],

  // drawing state
  tool: 'pen', // pen | marker | highlighter | calligraphy | spray | eraser | rect | ellipse | line | arrow | diamond | triangle | star | text
  color: '#111827',
  width: 4,
  opacity: 1,
  fillShapes: false,

  connected: false,
  sidebarOpen: false,

  setMe: (me) => set({ me }),
  setRoom: (room) => set({ room }),
  setUsers: (users) => set({ users }),
  setConnected: (connected) => set({ connected }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setWidth: (width) => set({ width }),
  setOpacity: (opacity) => set({ opacity }),
  setFillShapes: (fillShapes) => set({ fillShapes }),

  setMessages: (messages) => set({ messages }),
  addMessage: (m) =>
    set((s) => (s.messages.some((x) => x._id === m._id) ? s : { messages: [...s.messages, m] })),

  reset: () => set({ users: [], messages: [], connected: false }),
}));
