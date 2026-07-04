import { create } from 'zustand';
import api from '../services/api';
import logger from '../utils/logger';

export interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
  timestamp: string;
  tokensUsed?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}

interface ChatState {
  whatsappNumber: string;
  messages: ChatMessage[];
  isLoading: boolean;
  setWhatsappNumber: (whatsappNumber: string) => void;
  addMessage: (message: ChatMessage) => void;
  fetchHistory: () => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  clearLocalHistory: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  whatsappNumber: '',
  messages: [],
  isLoading: false,

  setWhatsappNumber: (whatsappNumber) => {
    set({ whatsappNumber, messages: [] });
    if (whatsappNumber) {
      get().fetchHistory();
    }
  },

  addMessage: (message) => {
    // Prevent duplicate messages if already appended via socket or REST response
    const exists = get().messages.some(
      (m) => m.text === message.text && m.sender === message.sender && 
             Math.abs(new Date(m.timestamp).getTime() - new Date(message.timestamp).getTime()) < 3000
    );
    if (!exists) {
      set((state) => ({ messages: [...state.messages, message] }));
    }
  },

  fetchHistory: async () => {
    const num = get().whatsappNumber;
    if (!num) return;
    set({ isLoading: true });
    try {
      const response = await api.get(`/chat/history?whatsappNumber=${num}`);
      const history = response.data.history.map((h: any) => ({
        sender: h.role === 'user' ? 'user' : 'model',
        text: h.message,
        timestamp: h.timestamp || new Date().toISOString(),
      }));
      set({ messages: history, isLoading: false });
    } catch (err) {
      logger.error('Error fetching chat history:', err);
      set({ isLoading: false });
    }
  },

  sendMessage: async (text) => {
    const num = get().whatsappNumber;
    if (!num) return;
    
    // Add user message locally
    const userMsg: ChatMessage = {
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    set((state) => ({ messages: [...state.messages, userMsg], isLoading: true }));

    try {
      const response = await api.post('/chat', {
        whatsappNumber: num,
        message: text,
      });

      const reply = response.data.response;
      const tokensUsed = response.data.tokensUsed;

      const modelMsg: ChatMessage = {
        sender: 'model',
        text: reply,
        tokensUsed,
        timestamp: new Date().toISOString(),
      };
      
      set((state) => ({ messages: [...state.messages, modelMsg], isLoading: false }));
    } catch (err) {
      logger.error('Error sending message:', err);
      set({ isLoading: false });
    }
  },

  clearLocalHistory: () => {
    set({ messages: [] });
  }
}));
export default useChatStore;
