import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useChatStore } from '../store/chatStore';
import { useSocket } from '../hooks/useSocket';
import { Send, Phone, User, MessageCircle, LogOut, ArrowRight, Smartphone, RefreshCw, CreditCard } from 'lucide-react';

export const PatientChat: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { whatsappNumber, messages, isLoading, setWhatsappNumber, addMessage, sendMessage, clearLocalHistory } = useChatStore();
  
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Initialize store phone number based on logged in user's phone number
  useEffect(() => {
    if (user && !whatsappNumber) {
      setWhatsappNumber(user.phoneNumber);
    }
  }, [user, whatsappNumber, setWhatsappNumber]);

  // Hook real-time websocket updates for this user's conversation
  useSocket(`chat:${whatsappNumber}:message`, (message: any) => {
    addMessage(message);
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const textToSend = inputText;
    setInputText('');
    await sendMessage(textToSend);
  };

  const handleLogout = () => {
    logout();
    clearLocalHistory();
    navigate('/');
  };

  // Helper: Renders normal text, intercepting mock payment links and rendering clickable payment cards
  const renderMessageContent = (text: string) => {
    if (text.includes('/payments/checkout-session')) {
      const match = text.match(/checkout-session\?appointmentId=([a-f0-9-]+)/);
      const apptId = match ? match[1] : '';
      const textParts = text.split(/http.*/); // Split off the url portion
      
      return (
        <div className="space-y-3">
          <p className="whitespace-pre-wrap">{textParts[0]}</p>
          <div className="bg-slate-900 border border-indigo-500/30 p-4 rounded-xl flex flex-col gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-900/50 p-2 rounded-lg text-indigo-400">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Stripe Payment Invoice</h4>
                <p className="text-[10px] text-slate-500">Ref: {apptId.slice(0, 8)}...</p>
              </div>
            </div>
            <a
              href={`/mock-checkout?appointmentId=${apptId}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-center text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10"
            >
              <span>Pay consultation $50.00</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      );
    }

    return <p className="whitespace-pre-wrap">{text}</p>;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-indigo-900/10 blur-3xl pointer-events-none" />

      {/* 1. SIDEBAR (User Profile & Control) */}
      <div className="w-full md:w-80 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800/80 p-6 flex flex-col justify-between z-10">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="bg-indigo-600 p-2 rounded-lg text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg text-white font-display">Clinic Chat</span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-950/40 rounded-lg transition-all"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-900/30 p-2.5 rounded-full text-indigo-400">
                <User className="h-5 w-5" />
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-semibold text-slate-200 truncate">{user?.name}</h4>
                <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" />
                  {user?.phoneNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quick Actions</h5>
            <button
              onClick={() => sendMessage('restart')}
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Restart Conversation Menu
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/60 text-[10px] text-slate-500 text-center">
          Powered by Gemini 1.5 & ClinicFlow AI
        </div>
      </div>

      {/* 2. CHAT PANEL (Simulated Phone screen) */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 z-10">
        {/* Phone Frame wrapper */}
        <div className="max-w-[400px] w-full h-[620px] bg-slate-900 border border-slate-800 shadow-2xl rounded-[38px] p-3 flex flex-col relative">
          
          {/* iOS Notch simulator */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
            <div className="w-12 h-1 bg-slate-950 rounded-full" />
          </div>

          {/* Internal Screen */}
          <div className="flex-1 bg-[#090d1f] rounded-[28px] overflow-hidden flex flex-col relative border border-slate-950">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

            {/* Chat Header */}
            <div className="bg-slate-900 border-b border-slate-950/80 px-4 pt-6 pb-3 flex items-center gap-3 z-10">
              <div className="relative">
                <div className="bg-indigo-600 h-9 w-9 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-indigo-500/20">
                  CR
                </div>
                <div className="h-2.5 w-2.5 bg-emerald-500 border border-[#090d1f] rounded-full absolute bottom-0 right-0" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Clinic AI Assistant</h4>
                <p className="text-[9px] text-slate-500 flex items-center gap-1">
                  Online
                </p>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {renderMessageContent(msg.text)}
                    
                    {/* Timestamp */}
                    <div
                      className={`text-[8px] text-right mt-1.5 ${
                        msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'
                      }`}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 space-y-1.5 max-w-[80%]">
                    <div className="flex gap-1.5 items-center justify-center py-1">
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-950/80 flex gap-2 z-10">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-xl transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center shrink-0"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};
export default PatientChat;
