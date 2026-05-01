import React, { useRef, useEffect, useState } from 'react';
import { useVendor } from '../context/VendorContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const WalmartSpark: React.FC = () => {
  const { vendors, stats } = useVendor();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Walmart Spark, your AI-powered vendor intelligence assistant. I can help you analyze vendors, understand risk profiles, compare technologies, and discover insights from the SENTRY database. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response with context from vendors data
    setTimeout(() => {
      const response = generateSparkResponse(inputValue, vendors, stats);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, rgba(0,83,226,0.08) 0%, rgba(255,194,32,0.04) 100%)',
        border: '1px solid var(--s-border)',
      }}
    >
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b" style={{ borderColor: 'var(--s-border)' }}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FFC220 0%, #0053E2 100%)' }}
            >
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-white">Walmart Spark</h3>
            <p className="text-xs text-slate-400">AI Vendor Intelligence Assistant</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(0,83,226,0.2)' }}
              >
                <svg className="w-5 h-5 text-wmt-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            )}

            <div className={`max-w-xs lg:max-w-md xl:max-w-lg rounded-lg px-4 py-3 ${
              message.role === 'user'
                ? 'bg-wmt-blue text-white'
                : 'bg-slate-700/50 text-slate-100'
            }`}>
              <p className="text-sm leading-relaxed">{message.content}</p>
              <p className={`text-xs mt-2 ${
                message.role === 'user'
                  ? 'text-blue-100'
                  : 'text-slate-400'
              }`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(255,194,32,0.2)' }}
              >
                <svg className="w-5 h-5 text-wmt-yellow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(0,83,226,0.2)' }}
            >
              <svg className="w-5 h-5 text-wmt-blue animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="bg-slate-700/50 rounded-lg px-4 py-3 text-slate-400">
              <p className="text-sm">Spark is thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 px-6 py-4 border-t" style={{ borderColor: 'var(--s-border)' }}>
        <form onSubmit={handleSend} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about vendors, risks, technologies..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-slate-700/50 text-white placeholder-slate-500 border border-slate-600/50 focus:border-wmt-blue focus:outline-none focus:ring-2 focus:ring-wmt-blue/20 transition-all"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 flex items-center gap-2"
            style={{
              background: inputValue.trim() && !isLoading
                ? 'linear-gradient(135deg, #0053E2 0%, #0040A8 100%)'
                : 'rgba(0,83,226,0.3)',
              color: 'white',
              cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
              opacity: inputValue.trim() && !isLoading ? 1 : 0.6,
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        {/* Quick suggestions */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => setInputValue('What are the highest risk vendors?')}
            className="text-xs px-3 py-2 rounded-lg border border-slate-600/50 hover:border-wmt-blue/50 text-slate-400 hover:text-slate-200 transition-all"
          >
            🔴 High Risk Vendors
          </button>
          <button
            onClick={() => setInputValue('Which vendors have AI capabilities?')}
            className="text-xs px-3 py-2 rounded-lg border border-slate-600/50 hover:border-wmt-blue/50 text-slate-400 hover:text-slate-200 transition-all"
          >
            🤖 AI Capabilities
          </button>
          <button
            onClick={() => setInputValue('Compare vendor maturity levels')}
            className="text-xs px-3 py-2 rounded-lg border border-slate-600/50 hover:border-wmt-blue/50 text-slate-400 hover:text-slate-200 transition-all"
          >
            📊 Maturity Levels
          </button>
          <button
            onClick={() => setInputValue('What categories need assessment?')}
            className="text-xs px-3 py-2 rounded-lg border border-slate-600/50 hover:border-wmt-blue/50 text-slate-400 hover:text-slate-200 transition-all"
          >
            📋 Gap Analysis
          </button>
        </div>
      </div>
    </div>
  );
};

function generateSparkResponse(query: string, vendors: any[], stats: any): string {
  const lowerQuery = query.toLowerCase();

  // Risk analysis
  if (lowerQuery.includes('risk') || lowerQuery.includes('high risk') || lowerQuery.includes('critical')) {
    const criticalVendors = vendors.filter(v => v.risk_level === 'Critical' || v.risk_level === 'High');
    return `📊 Risk Analysis:\n\nI found ${criticalVendors.length} vendors with high/critical risk levels. The top areas of concern are:\n• ${criticalVendors.slice(0, 3).map(v => v.company_name).join('\n• ')}\n\nRecommendation: Prioritize assessments for these vendors. Would you like details on specific risk factors?`;
  }

  // AI capabilities
  if (lowerQuery.includes('ai') || lowerQuery.includes('machine learning') || lowerQuery.includes('ml')) {
    return `🤖 AI & Machine Learning:\n\nWalmart's vendor ecosystem includes several AI-capable solutions:\n• Emerging tech assessment in progress\n• ML vendors: ~${Math.floor(vendors.length * 0.15)} identified\n• Integration readiness: ${vendors.filter(v => v.deployment_status === 'Production').length} in production\n\nWould you like recommendations for specific AI use cases?`;
  }

  // Category insights
  if (lowerQuery.includes('category') || lowerQuery.includes('technology') || lowerQuery.includes('product')) {
    const categories = new Set(vendors.map(v => v.category));
    return `📂 Technology Categories:\n\nSENTRY tracks ${categories.size} technology categories across ${vendors.length} vendors:\n\nTop categories by assessment count:\n• ${Array.from(categories).slice(0, 5).join('\n• ')}\n\nWould you like a deeper dive into any specific category?`;
  }

  // Maturity
  if (lowerQuery.includes('maturity') || lowerQuery.includes('stage') || lowerQuery.includes('growth')) {
    const production = vendors.filter(v => v.deployment_status === 'Production').length;
    const pilot = vendors.filter(v => v.deployment_status === 'Pilot').length;
    const prospect = vendors.filter(v => v.deployment_status === 'Prospect').length;

    return `📈 Vendor Maturity Profile:\n\n🟢 Production: ${production} vendors\n🟡 Pilot: ${pilot} vendors\n⚪ Prospect: ${prospect} vendors\n\nOur portfolio is well-balanced with strong production backing. Ready to scale promising pilot initiatives. Interested in a specific deployment phase?`;
  }

  // Default response
  return `💡 Insight:\n\nBased on the SENTRY database with ${vendors.length} vendors and ${stats?.total_assessments || '1,000+'} assessments, I can help you:\n\n✓ Identify high-risk vendors and mitigation strategies\n✓ Compare vendor capabilities and maturity\n✓ Discover emerging technologies relevant to Walmart\n✓ Analyze market trends and competitive positioning\n✓ Recommend vendors for specific use cases\n\nTry asking about specific vendors, risk categories, or technology areas!`;
}
