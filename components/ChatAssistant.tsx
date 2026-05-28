import React, { useState, useRef, useEffect } from 'react';
import { sendChat, ChatMessage as ApiMessage } from '../services/api';

interface DisplayMessage extends ApiMessage {
  id: string;
  timestamp: Date;
  editedAt?: Date;
}

const makeWelcomeMessage = (): DisplayMessage => ({
  id: 'welcome',
  role: 'model',
  text: 'Hello. I am SENTRY-AI. I can help you understand the vendor security framework, architecture, or specific security controls like IAP and CMEK. How can I assist?',
  timestamp: new Date(),
});

const formatTranscript = (messages: DisplayMessage[]): string => {
  const lines = [
    '# SENTRY Mission Chat Transcript',
    '',
    `Exported: ${new Date().toISOString()}`,
    '',
  ];

  messages
    .filter(message => message.id !== 'welcome')
    .forEach(message => {
      const role = message.role === 'user' ? 'User' : 'SENTRY-AI';
      const edited = message.editedAt ? ` · edited ${message.editedAt.toISOString()}` : '';
      lines.push(`## ${role} · ${message.timestamp.toISOString()}${edited}`);
      lines.push('');
      lines.push(message.text);
      lines.push('');
    });

  return lines.join('\n');
};

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
  const [messages, setMessages] = useState<DisplayMessage[]>([makeWelcomeMessage()]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const beginEdit = (message: DisplayMessage) => {
    if (message.id === 'welcome' || isLoading) return;
    setEditingMessageId(message.id);
    setEditingText(message.text);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEdit = (messageId: string) => {
    const nextText = editingText.trim();
    if (!nextText) return;

    setMessages(prev => prev.map(message => (
      message.id === messageId
        ? { ...message, text: nextText, editedAt: new Date() }
        : message
    )));
    cancelEdit();
  };

  const deleteMessage = (messageId: string) => {
    if (messageId === 'welcome' || isLoading) return;
    setMessages(prev => prev.filter(message => message.id !== messageId));
    if (editingMessageId === messageId) cancelEdit();
  };

  const resetConversation = () => {
    setMessages([makeWelcomeMessage()]);
    setInputValue('');
    cancelEdit();
  };

  const exportTranscript = () => {
    const transcript = formatTranscript(messages);
    const blob = new Blob([transcript], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sentry-mission-chat-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text || isLoading || editingMessageId) return;

    const userMsg: DisplayMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);

    try {
      // Build history for Gemini — exclude the UI welcome message and current user turn.
      const history: ApiMessage[] = updatedMessages
        .filter(m => m.id !== 'welcome')
        .slice(0, -1)
        .map(({ role, text: t }) => ({ role, text: t }));

      const result = await sendChat(history, text);

      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: 'model',
          text: result.response,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reach SENTRY backend.';
      setMessages(prev => [
        ...prev,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          role: 'model',
          text: `⚠️ **SENTRY-AI unavailable:** ${msg}\n\nMake sure the FastAPI backend is running and the frontend can reach the configured API base URL.`,
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
        className="px-4 py-3 flex items-center justify-between gap-3 shrink-0"
        style={{
          borderBottom: '1px solid rgba(0,83,226,0.15)',
          background: 'linear-gradient(90deg, rgba(0,83,226,0.08) 0%, transparent 100%)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Terminal monogram */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
            style={{ background: 'rgba(0,83,226,0.2)', border: '1px solid rgba(0,83,226,0.35)', color: '#4d9fff' }}
          >
            AI
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              SENTRY-AI
              {/* Terminal cursor blink */}
              <span
                className="inline-block w-1.5 h-3.5 rounded-sm bg-green-400 animate-cursor-blink"
                aria-hidden="true"
              />
            </h3>
            <p className="text-[9px] uppercase tracking-widest truncate" style={{ color: 'var(--s-text-dim)' }}>
              Editable local mission chat · Context-Aware
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportTranscript}
            disabled={messages.length <= 1}
            className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
            style={{ color: '#bfdbfe', border: '1px solid rgba(0,83,226,0.35)', background: 'rgba(0,83,226,0.08)' }}
          >
            Export
          </button>
          <button
            type="button"
            onClick={resetConversation}
            disabled={messages.length <= 1 || isLoading}
            className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
            style={{ color: '#fed7aa', border: '1px solid rgba(153,82,19,0.45)', background: 'rgba(255,194,32,0.08)' }}
          >
            Reset
          </button>
          {/* Connected status */}
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <div className="relative w-1.5 h-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="absolute inset-0 rounded-full bg-green-400 animate-ping-ring" />
            </div>
            <span className="text-[9px] uppercase tracking-wider" style={{ color: '#22c55e' }}>Connected</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3" role="log" aria-live="polite">
        {messages.map(msg => {
          const isEditing = editingMessageId === msg.id;
          const canEdit = msg.id !== 'welcome' && !isLoading;

          return (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="group max-w-[85%] rounded-xl p-3 text-sm"
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
                {isEditing ? (
                  <div className="space-y-2">
                    <label htmlFor={`edit-${msg.id}`} className="sr-only">Edit message</label>
                    <textarea
                      id={`edit-${msg.id}`}
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      className="w-full min-h-24 rounded-lg p-2 text-sm font-mono"
                      style={{
                        background: 'rgba(255,255,255,0.92)',
                        border: '1px solid rgba(0,83,226,0.35)',
                        color: '#111827',
                      }}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: '#e5e7eb', border: '1px solid rgba(148,163,184,0.45)' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(msg.id)}
                        disabled={!editingText.trim()}
                        className="rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider disabled:opacity-40"
                        style={{ color: '#ffffff', background: '#0053e2' }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>{msg.role === 'model' ? renderMarkdown(msg.text) : msg.text}</div>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div
                        className="text-[10px] opacity-60"
                        style={{ color: msg.role === 'user' ? '#bfdbfe' : '#334155', fontFamily: 'monospace' }}
                      >
                        {msg.timestamp.toLocaleTimeString()}
                        {msg.editedAt && <span> · edited</span>}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => beginEdit(msg)}
                            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: msg.role === 'user' ? '#dbeafe' : '#0053e2', border: '1px solid rgba(148,163,184,0.35)' }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteMessage(msg.id)}
                            className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{ color: '#fecaca', border: '1px solid rgba(234,17,0,0.35)' }}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
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
          placeholder={editingMessageId ? 'Finish editing before sending…' : 'Ask about Phase III controls, vendor risks…'}
          disabled={isLoading || Boolean(editingMessageId)}
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
          disabled={isLoading || Boolean(editingMessageId) || !inputValue.trim()}
          className="btn-primary shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
};
