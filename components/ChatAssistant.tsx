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
          text: `⚠️ **SENTRY-AI unavailable:** ${msg}\n\nMake sure the FastAPI backend is running on port 8081.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{
        height: 600,
        background: 'var(--s-chat)',
        border: '1px solid rgba(0,83,226,0.2)',
        boxShadow: '0 0 0 1px rgba(0,83,226,0.08), inset 0 1px 0 rgba(0,83,226,0.1)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between shrink-0"
        style={{
          borderBottom: '1px solid rgba(0,83,226,0.15)',
          background: 'linear-gradient(90deg, rgba(0,83,226,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3">
          {/* Terminal monogram */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
            style={{ background: 'rgba(0,83,226,0.2)', border: '1px solid rgba(0,83,226,0.35)', color: '#4d9fff' }}
          >
            AI
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              SENTRY-AI
              {/* Terminal cursor blink */}
              <span
                className="inline-block w-1.5 h-3.5 rounded-sm bg-green-400 animate-cursor-blink"
                aria-hidden="true"
              />
            </h3>
            <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--s-text-dim)' }}>
              Powered by Google Gemini · Context-Aware
            </p>
          </div>
        </div>
        {/* Connected status */}
        <div className="flex items-center gap-1.5">
          <div className="relative w-1.5 h-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
            <div className="absolute inset-0 rounded-full bg-green-400 animate-ping-ring" />
          </div>
          <span className="text-[9px] uppercase tracking-wider" style={{ color: '#22c55e' }}>Connected</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3" role="log" aria-live="polite">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[85%] rounded-xl p-3 text-sm"
              style={msg.role === 'user' ? {
                background: 'linear-gradient(135deg, #0053E2, #002880)',
                color: '#ffffff',
                borderBottomRightRadius: '4px',
              } : {
                background: 'var(--s-ai-bubble)',
                color: 'var(--s-text-muted)',
                border: '1px solid rgba(0,83,226,0.18)',
                borderLeft: '2px solid rgba(0,83,226,0.5)',
                borderBottomLeftRadius: '4px',
              }}
            >
              <div>{msg.role === 'model' ? renderMarkdown(msg.text) : msg.text}</div>
              <div
                className="text-[10px] mt-1.5 opacity-50"
                style={{ color: msg.role === 'user' ? '#bfdbfe' : '#334155', fontFamily: 'monospace' }}
              >
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start" aria-label="SENTRY-AI is typing">
            <div
              className="rounded-xl p-3 flex items-center gap-1"
              style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(0,83,226,0.2)' }}
            >
              {/* Scanning bar instead of bounce dots */}
              <div
                className="relative h-3 overflow-hidden rounded-full"
                style={{ width: 48, background: 'rgba(0,83,226,0.15)' }}
                aria-hidden="true"
              >
                <div
                  className="absolute top-0 bottom-0 w-1/3 rounded-full bg-blue-400"
                  style={{ animation: 'shimmer 1.2s linear infinite', backgroundImage: 'linear-gradient(90deg, transparent, #4d9fff, transparent)' }}
                />
              </div>
              <span className="text-[10px] ml-2" style={{ color: '#334155', fontFamily: 'monospace' }}>analysing…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 shrink-0 flex gap-2"
        style={{ borderTop: '1px solid rgba(0,83,226,0.12)', background: 'rgba(0,0,0,0.3)' }}
      >
        <label htmlFor="chat-input" className="sr-only">Message SENTRY-AI</label>
        <input
          id="chat-input"
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Ask about Phase III controls, vendor risks…"
          disabled={isLoading}
          className="flex-grow text-sm rounded-lg px-4 py-2.5 disabled:opacity-50 font-mono"
          style={{
            background: 'var(--s-input-bg)',
            border: '1px solid rgba(0,83,226,0.2)',
            color: 'var(--s-text)',
            outline: 'none',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
          onFocus={e => {
            (e.target as HTMLInputElement).style.borderColor = 'rgba(0,83,226,0.5)';
            (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0,83,226,0.15)';
          }}
          onBlur={e => {
            (e.target as HTMLInputElement).style.borderColor = 'rgba(0,83,226,0.2)';
            (e.target as HTMLInputElement).style.boxShadow = 'none';
          }}
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="btn-primary shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
};