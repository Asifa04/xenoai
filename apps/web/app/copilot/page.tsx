'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Users, Target, Megaphone, TrendingUp, Bot, User, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui';

const CRM_URL = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:4000';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tool?: { name: string; result: Record<string, unknown> };
  timestamp: Date;
}

const SUGGESTIONS = [
  { icon: <Target size={14} />, text: 'Find customers who haven\'t bought in 90 days' },
  { icon: <Megaphone size={14} />, text: 'Create a win-back campaign for inactive shoppers' },
  { icon: <Users size={14} />, text: 'Who are my top 10 highest-value customers?' },
  { icon: <TrendingUp size={14} />, text: 'Give me an overview of my CRM performance' },
  { icon: <Sparkles size={14} />, text: 'Create a campaign for coffee buyers with a 20% discount' },
  { icon: <Target size={14} />, text: 'Segment frequent buyers from Mumbai' },
];

function ToolResultCard({ tool, result }: { tool: string; result: Record<string, unknown> }) {
  if (tool === 'create_segment' && (result as any).segment) {
    const seg = (result as any).segment;
    return (
      <div style={{
        margin: '8px 0', padding: '12px 14px', borderRadius: 8,
        background: 'var(--success-bg)', border: '1px solid rgba(74,222,128,0.15)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>
          ✓ Segment Created
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
          <strong>{seg.name}</strong> · {seg.size} customers
        </div>
        <Link href="/segments" style={{ fontSize: 11, color: 'var(--accent-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
          View segments <ChevronRight size={11} />
        </Link>
      </div>
    );
  }

  if (tool === 'get_top_customers' && (result as any).customers) {
    const customers = (result as any).customers.slice(0, 5);
    return (
      <div style={{
        margin: '8px 0', padding: '12px 14px', borderRadius: 8,
        background: 'var(--info-bg)', border: '1px solid rgba(96,165,250,0.15)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--info)', marginBottom: 8 }}>
          📊 Top Customers
        </div>
        {customers.map((c: any, i: number) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: i > 0 ? '1px solid rgba(96,165,250,0.1)' : 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{i + 1}. {c.name}</span>
            <span style={{ fontSize: 12, color: 'var(--info)', fontWeight: 600 }}>
              ₹{c.totalSpend >= 1000 ? `${(c.totalSpend / 1000).toFixed(1)}K` : c.totalSpend}
            </span>
          </div>
        ))}
        <Link href="/customers" style={{ fontSize: 11, color: 'var(--accent-light)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          View all customers <ChevronRight size={11} />
        </Link>
      </div>
    );
  }

  if (tool === 'get_stats') {
    return (
      <div style={{
        margin: '8px 0', padding: '12px 14px', borderRadius: 8,
        background: 'var(--accent-bg)', border: '1px solid rgba(124,111,205,0.15)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 8 }}>
          📈 CRM Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.entries(result).filter(([k]) => k !== 'campaigns').map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                {k === 'revenue' ? `₹${Number(v) >= 100000 ? `${(Number(v) / 100000).toFixed(1)}L` : Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}K` : v}` : String(v)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const history = [...messages, userMsg].map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${CRM_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      if (!res.ok) throw new Error('Failed to connect to AI');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'text') {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + data.text } : m)
              );
            } else if (data.type === 'tool') {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, tool: { name: data.tool, result: data.result } } : m)
              );
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantId ? { ...m, content: 'Sorry, I had trouble connecting. Please check the CRM service is running.' } : m)
      );
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--bg-card)',
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'linear-gradient(135deg, #7c6fcd, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sparkles size={16} color="white" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>XenoAI Copilot</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Your AI marketing teammate — ask anything, take action</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span style={{
            fontSize: 11, padding: '3px 8px', borderRadius: 100,
            background: 'var(--success-bg)', color: 'var(--success)',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Online
          </span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div className="animate-fade-in" style={{ textAlign: 'center', paddingTop: 40 }}>
            <div style={{
              width: 60, height: 60, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(124,111,205,0.3), rgba(167,139,250,0.15))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
              border: '1px solid rgba(124,111,205,0.2)',
            }}>
              <Sparkles size={24} color="var(--accent-light)" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              Hey, I&apos;m XenoAI
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 380, margin: '0 auto 32px', lineHeight: 1.6 }}>
              I can create customer segments, launch campaigns, find your best shoppers,
              and analyze performance — all from a single message.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 600, margin: '0 auto' }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s.text)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; }}
                >
                  <span style={{ color: 'var(--accent-light)' }}>{s.icon}</span>
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className="animate-slide-in"
            style={{
              display: 'flex', gap: 10,
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              alignItems: 'flex-start',
              maxWidth: 780, margin: msg.role === 'user' ? '0 0 0 auto' : '0 auto 0 0',
            }}>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #3b3b5c, #2a2a42)'
                : 'linear-gradient(135deg, #7c6fcd, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {msg.role === 'user' ? <User size={13} color="var(--text-secondary)" /> : <Bot size={13} color="white" />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Tool result card */}
              {msg.tool && <ToolResultCard tool={msg.tool.name} result={msg.tool.result} />}

              {/* Text bubble */}
              {(msg.content || msg.role === 'assistant') && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: msg.role === 'user' ? 'var(--accent-bg)' : 'var(--bg-card)',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(124,111,205,0.2)' : 'var(--border)'}`,
                  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.65,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {msg.content || (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      {[0, 1, 2].map((i) => (
                        <span key={i} style={{
                          width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)',
                          animation: `pulse-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
                        }} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-card)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: 10, alignItems: 'flex-end',
          background: 'var(--bg)', borderRadius: 12,
          border: '1px solid var(--border-strong)',
          padding: '10px 14px',
          transition: 'border-color 0.15s',
        }}
          onFocus={() => {}}
        >
          <Sparkles size={16} color="var(--accent)" style={{ marginBottom: 2, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="Ask me to create a segment, launch a campaign, or analyze performance..."
            disabled={loading}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-card-hover)',
              border: 'none', cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
          >
            {loading ? <Spinner size={14} /> : <Send size={13} color={input.trim() ? 'white' : 'var(--text-muted)'} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>
          XenoAI can create segments and draft campaigns directly — not just chat.
        </div>
      </div>
    </div>
  );
}
