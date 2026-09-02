
import React, { useState, useEffect, useRef } from 'react';
import { AGENTS } from '../constants';
import { AgentConfig, Message } from '../types';
import { sendMessage } from '../services/llmService';

const AgentChat: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<AgentConfig>(AGENTS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      agentId: activeAgent.id
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await sendMessage(
        activeAgent.systemInstruction,
        messages.filter(m => m.agentId === activeAgent.id),
        input
      );

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: reply.text,
        timestamp: Date.now(),
        agentId: activeAgent.id,
        provider: reply.provider,
        model: reply.model,
        degraded: reply.degraded,
        primaryError: reply.primary_error ?? undefined
      };

      setMessages(prev => [...prev, aiMsg]);
      setChatError(null);
    } catch (err) {
      // A failed call is an error, never a model message.
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsTyping(false);
    }
  };

  const currentAgentMessages = messages.filter(m => m.agentId === activeAgent.id);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-indigo-50 overflow-hidden shadow-sm">
      <div className="flex flex-col border-b border-indigo-50 bg-indigo-50/10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-400 flex items-center justify-center text-2xl shadow-lg shadow-indigo-100">
              {activeAgent.icon}
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800">{activeAgent.name.split(' ')[0]} Agent</h2>
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Active Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-50 p-1.5 rounded-xl border border-indigo-50">
              {AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => setActiveAgent(agent)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
                    activeAgent.id === agent.id
                      ? 'bg-white text-indigo-500 shadow-sm ring-1 ring-indigo-50'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {agent.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tool Security Badges */}
        <div className="px-4 py-3 bg-slate-50 rounded-xl border border-indigo-50 mx-6 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Authorized Tools</h4>
            <span className="text-[8px] bg-white px-2 py-0.5 rounded-full border border-indigo-100 font-bold text-indigo-500">RBAC: {activeAgent.name.split(' ')[0]}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeAgent.id === 'procurement-agent' && (
              <>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">📋 SAP_EKKO_READ</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">📄 PO_ANALYZE</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">🏷️ VENDOR_EVAL</span>
              </>
            )}
            {activeAgent.id === 'inventory-agent' && (
              <>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">📊 ABC_CLASSIFY</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">⚖️ SAFETY_STOCK</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">📦 REORDER_POINT</span>
              </>
            )}
            {activeAgent.id === 'risk-agent' && (
              <>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">🌍 GEOPOLITICAL</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">📈 FINANCIAL_HEALTH</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">⚠️ DISRUPTION_SCAN</span>
              </>
            )}
            {activeAgent.id === 'compliance-agent' && (
              <>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">⚖️ EAR_EXPORT</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">🔨 CONFLICT_MINERALS</span>
                <span className="text-[8px] bg-white px-2 py-1 rounded-full border border-indigo-100 font-bold text-indigo-500">📋 AUDIT_TRAIL</span>
              </>
            )}
          </div>
          <p className="text-[8px] text-slate-400 mt-2 italic flex items-center gap-1">
            <span className="w-1 h-1 bg-emerald-400 rounded-full"></span>
            All tool calls validated against tenant IAM policies
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fcfdff]" ref={scrollRef}>
        {currentAgentMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
              🧚
            </div>
            <h3 className="text-xl font-black text-slate-800 mb-2">System Ready</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              I am your {activeAgent.name} assistant. I'm optimized for pastel-perfect supply chain logic and SAP data parsing.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-3 w-full">
              {["What is the lead time for ASML masks?", "Analyze safety stock for HBM3 die."].map((prompt, i) => (
                <button 
                  key={i}
                  onClick={() => setInput(prompt)}
                  className="text-left px-5 py-4 bg-white border border-indigo-50 rounded-xl text-sm font-medium text-slate-600 hover:bg-indigo-50 transition-all hover:scale-[1.02] shadow-sm"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          currentAgentMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-5 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-400 text-white rounded-br-none'
                    : 'bg-white border border-indigo-50 text-slate-700 rounded-bl-none'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                  {msg.content}
                </div>
                {msg.role === 'model' && msg.degraded && (
                  <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
                    <div className="text-[10px] font-black uppercase tracking-wide text-amber-800">
                      Degraded answer — fallback provider
                    </div>
                    {msg.primaryError && (
                      <div className="text-[10px] font-mono text-amber-700 mt-1 break-words">
                        {msg.primaryError}
                      </div>
                    )}
                  </div>
                )}
                <div className={`text-[10px] mt-2 font-bold uppercase tracking-tighter opacity-60 ${msg.role === 'user' ? 'text-indigo-50' : 'text-indigo-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.role === 'model' && msg.provider && (
                    <span className="ml-2 normal-case tracking-normal">
                      via {msg.provider}{msg.model ? ` · ${msg.model}` : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        {chatError && (
          <div className="flex justify-start">
            <div className="max-w-[75%] rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3">
              <div className="text-xs font-black text-rose-700 mb-1">Could not get an answer</div>
              <div className="text-[11px] font-mono text-rose-600 break-words">{chatError}</div>
            </div>
          </div>
        )}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border border-indigo-50 rounded-2xl px-5 py-4 rounded-bl-none shadow-sm">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce delay-150"></div>
                <div className="w-2 h-2 bg-indigo-200 rounded-full animate-bounce delay-300"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-indigo-50 bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask the ${activeAgent.name.split(' ')[0]} specialist...`}
            className="w-full bg-slate-50 border border-indigo-50 rounded-2xl py-4 pl-6 pr-14 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all font-medium placeholder:text-slate-300"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="absolute right-3 p-2.5 bg-indigo-400 text-white rounded-xl hover:bg-indigo-500 disabled:bg-slate-200 transition-all shadow-lg shadow-indigo-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 5l7 7-7 7M5 5l7 7-7 7"/></svg>
          </button>
        </div>
        <p className="mt-4 text-center text-[9px] text-indigo-300 font-black uppercase tracking-[0.2em]">
          {'Provider is reported per answer above'}
        </p>
      </div>
    </div>
  );
};

export default AgentChat;
