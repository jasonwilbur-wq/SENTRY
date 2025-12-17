import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { getGeminiResponse } from '../services/geminiService';

export const ChatAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello. I am SENTRY-AI. I can help you understand the vendor security framework, architecture, or specific security controls like IAP and CMEK. How can I assist?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const responseText = await getGeminiResponse(userMsg.text);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-sentry-card rounded-lg border border-slate-700 shadow-lg h-[600px] flex flex-col">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50 rounded-t-lg">
        <h3 className="text-lg font-bold text-sentry-accent flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          SENTRY-AI Assistant
        </h3>
        <p className="text-xs text-slate-400 mt-1">Powered by Google Gemini • Context Aware</p>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-sentry-accent text-slate-900'
                  : 'bg-slate-700 text-slate-200 border border-slate-600'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              <div className={`text-[10px] mt-1 opacity-70 ${msg.role === 'user' ? 'text-slate-800' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-700 text-slate-200 rounded-lg p-3 text-sm border border-slate-600 flex items-center gap-2">
              <div className="w-2 h-2 bg-sentry-accent rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-sentry-accent rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-sentry-accent rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-700 bg-slate-800/30 rounded-b-lg">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about Phase III security controls..."
            className="flex-grow bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:border-sentry-accent focus:ring-1 focus:ring-sentry-accent"
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              isLoading 
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed' 
                : 'bg-sentry-accent text-slate-900 hover:bg-sky-400'
            }`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};