import React, { useState, useRef, useEffect } from 'react';
import { sendChat, ChatMessage as ApiMessage } from '../services/api';

interface DisplayMessage extends ApiMessage {
  id: string;
  timestamp: Date;
}

/** Minimal markdown renderer for model response bubbles */
function renderMarkdown(text: string): React.ReactNode {
  return text.split('\n').map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : part,
    );
    if (line.startsWith('## ')) return <h4 key={i} className="font-bold text-sentry-accent mt-2 text-sm">{line.slice(3)}</h4>;
    if (line.startsWith('# '))  return <h3 key={i} className="font-bold text-white mt-2">{line.slice(2)}</h3>;
    if (line.match(/^[•\-*] /))  return <li key={i} className="ml-4 list-disc text-slate-200">{rendered.slice(1)}</li>;
    if (line.trim() === '')     return <br key={i} />;
    return <p key={i} className="leading-relaxed">{rendered}</p>;
  });
}

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello. I am SENTRY-AI. I can help you understand the vendor security framework, architecture, or specific security controls like IAP and CMEK. How can I assist?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading) return;

    const userMsg: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build history for Gemini — exclude the UI welcome message
      const history: ApiMessage[] = updatedMessages
        .filter(m => m.id !== 'welcome')
        .slice(0, -1)                          // exclude current user turn
        .map(({ role, text: t }) => ({ role, text: t }));

      const result = await sendChat(history, text);

      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: 'model', text: result.response, timestamp: new Date() },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reach SENTRY backend.';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: `⚠️ **SENTRY-AI unavailable:** ${msg}\n\nMake sure the FastAPI backend is running on port 8080.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-sentry-card rounded-lg border border-slate-700 shadow-lg h-[600px] flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-lg">
        <h3 className="text-lg font-bold text-sentry-accent flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" aria-hidden="true" />
          SENTRY-AI Assistant
        </h3>
        <p className="text-xs text-slate-400 mt-1">Powered by Google Gemini · Full context-aware conversation</p>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg p-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-wmt-blue text-white'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              <div>{msg.role === 'model' ? renderMarkdown(msg.text) : msg.text}</div>
              <div className={`text-[10px] mt-1.5 opacity-60 ${
                msg.role === 'user' ? 'text-slate-800' : 'text-slate-400'
              }`}>
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start" aria-label="SENTRY-AI is typing">
            <div className="bg-slate-700 rounded-lg p-3 border border-slate-600 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-sentry-accent rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-sentry-accent rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-2 h-2 bg-sentry-accent rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-slate-800/30 rounded-b-lg">
        <div className="flex gap-2">
          <label htmlFor="chat-input" className="sr-only">Message SENTRY-AI</label>
          <input
            id="chat-input"
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask about Phase III controls, vendor risks…"
            disabled={isLoading}
            className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-sentry-accent focus:ring-1 focus:ring-sentry-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2 rounded-lg font-semibold transition-colors bg-wmt-blue text-white hover:bg-wmt-yellow hover:text-wmt-void disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};