'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Rocket, RefreshCw, Sparkles, TrendingUp, Users, Mail } from 'lucide-react';
import { api, Campaign, CampaignAnalytics } from '@/lib/api';
import { Card, Button, StatusBadge, Badge, Spinner, ProgressBar } from '@/components/ui';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  FunnelChart, Funnel, Cell, LabelList,
} from 'recharts';

function pct(n: number, d: number) {
  if (!d) return '0%';
  return `${((n / d) * 100).toFixed(1)}%`;
}
function fmt(n: number) {
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

const FUNNEL_COLORS = ['#7c6fcd', '#60a5fa', '#4ade80', '#fb923c', '#f472b6'];

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api.getCampaign(id),
        api.getCampaignAnalytics(id).catch(() => null),
      ]);
      setCampaign(c);
      setAnalytics(a);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh while campaign is running
  useEffect(() => {
    if (campaign?.status !== 'RUNNING') { setAutoRefresh(false); return; }
    setAutoRefresh(true);
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [campaign?.status, load]);

  async function handleLaunch() {
    if (!confirm('Launch this campaign?')) return;
    setLaunching(true);
    try {
      const res = await api.launchCampaign(id);
      alert(`🚀 Launched! ${res.recipientCount} messages queued.`);
      await load();
    } catch (err: any) { alert(`Error: ${err.message}`); }
    finally { setLaunching(false); }
  }

  async function handleAnalyze() {
    setAnalyzing(true);
    setAiAnalysis('');
    try {
      const res = await api.analyzeCampaign(id);
      setAiAnalysis(res.analysis);
    } catch (e) { console.error(e); }
    finally { setAnalyzing(false); }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spinner size={32} />
    </div>
  );
  if (!campaign) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Campaign not found</div>;

  const a = analytics;
  const funnelData = a ? [
    { name: 'Sent', value: a.totalSent, fill: FUNNEL_COLORS[0] },
    { name: 'Delivered', value: a.delivered, fill: FUNNEL_COLORS[1] },
    { name: 'Opened', value: a.opened, fill: FUNNEL_COLORS[2] },
    { name: 'Read', value: a.read, fill: FUNNEL_COLORS[3] },
    { name: 'Clicked', value: a.clicked, fill: FUNNEL_COLORS[4] },
  ] : [];

  const barData = a ? [
    { name: 'Delivery Rate', value: parseFloat(pct(a.delivered, a.totalSent)), color: '#60a5fa' },
    { name: 'Open Rate', value: parseFloat(pct(a.opened, a.delivered)), color: '#4ade80' },
    { name: 'Click Rate', value: parseFloat(pct(a.clicked, a.opened)), color: '#fb923c' },
  ] : [];

  const channelIcon: Record<string, string> = { EMAIL: '✉️', SMS: '💬', WHATSAPP: '📱' };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }} className="animate-fade-in">
      {/* Header */}
      <Button variant="ghost" size="sm" onClick={() => router.push('/campaigns')} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back to Campaigns
      </Button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
              {campaign.name}
            </h1>
            <StatusBadge status={campaign.status} />
            <Badge color="default">{channelIcon[campaign.channel]} {campaign.channel}</Badge>
            {autoRefresh && (
              <span style={{ fontSize: 11, color: 'var(--info)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={10} style={{ animation: 'spin 2s linear infinite' }} /> Live
              </span>
            )}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Segment: {campaign.segment?.name}
            {campaign.sentAt && ` · Launched ${new Date(campaign.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={load} variant="ghost" size="sm"><RefreshCw size={13} /></Button>
          {campaign.status === 'DRAFT' && (
            <Button onClick={handleLaunch} variant="primary" loading={launching}>
              <Rocket size={14} /> Launch Campaign
            </Button>
          )}
          {campaign.status === 'COMPLETED' && !aiAnalysis && (
            <Button onClick={handleAnalyze} variant="default" loading={analyzing}>
              <Sparkles size={14} /> AI Analysis
            </Button>
          )}
        </div>
      </div>

      {/* AI Analysis */}
      {(analyzing || aiAnalysis) && (
        <Card style={{ marginBottom: 16, border: '1px solid rgba(124,111,205,0.25)', background: 'linear-gradient(135deg, rgba(124,111,205,0.08), var(--bg-card))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={15} color="var(--accent-light)" />
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>AI Performance Analysis</span>
          </div>
          {analyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <Spinner size={14} /> Analyzing campaign performance...
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{aiAnalysis}</p>
          )}
        </Card>
      )}

      {/* Message preview */}
      <Card style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>Message</div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, fontStyle: 'italic' }}>
          "{campaign.message}"
        </div>
      </Card>

      {/* Analytics */}
      {a && a.totalSent > 0 ? (
        <>
          {/* Key metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Total Sent', value: a.totalSent.toLocaleString(), color: 'var(--accent-light)', icon: <Users size={15} /> },
              { label: 'Delivered', value: `${pct(a.delivered, a.totalSent)}`, sub: `${a.delivered} messages`, color: 'var(--info)', icon: <Mail size={15} /> },
              { label: 'Opened', value: `${pct(a.opened, a.delivered)}`, sub: `${a.opened} opens`, color: 'var(--success)', icon: <TrendingUp size={15} /> },
              { label: 'Clicked', value: `${pct(a.clicked, a.opened)}`, sub: `${a.clicked} clicks`, color: 'var(--warning)', icon: <TrendingUp size={15} /> },
            ].map((m) => (
              <Card key={m.label} style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ color: m.color }}>{m.icon}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{m.label}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: m.color, marginBottom: 2 }}>{m.value}</div>
                {m.sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.sub}</div>}
              </Card>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* Engagement funnel */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Engagement Funnel</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {funnelData.map((item, i) => (
                  <div key={item.name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.name}</span>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <span style={{ fontSize: 12, color: item.fill, fontWeight: 600 }}>{item.value.toLocaleString()}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 40, textAlign: 'right' }}>
                          {i === 0 ? '100%' : pct(item.value, funnelData[0].value)}
                        </span>
                      </div>
                    </div>
                    <div style={{ background: 'var(--border)', borderRadius: 100, height: 6, overflow: 'hidden' }}>
                      <div style={{
                        width: `${i === 0 ? 100 : (item.value / (funnelData[0].value || 1)) * 100}%`,
                        background: item.fill, height: '100%', borderRadius: 100,
                        transition: 'width 0.8s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              {a.failed > 0 && (
                <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--danger-bg)', borderRadius: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--danger)' }}>⚠ {a.failed} messages failed</span>
                </div>
              )}
            </Card>

            {/* Rate chart */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Engagement Rates</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={barData} barSize={32}>
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Recent communications */}
          {(campaign as any).communications?.length > 0 && (
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 14 }}>
                Recent Deliveries (sample)
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Recipient', 'Status', 'Sent At'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(campaign as any).communications.slice(0, 10).map((comm: any) => (
                    <tr key={comm.id}>
                      <td style={{ padding: '8px 0', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {comm.customer?.name} <span style={{ color: 'var(--text-muted)' }}>({comm.customer?.email})</span>
                      </td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)' }}>
                        <span style={{
                          fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 100,
                          background: comm.status === 'CLICKED' ? 'var(--success-bg)' : comm.status === 'FAILED' ? 'var(--danger-bg)' : comm.status === 'DELIVERED' ? 'var(--info-bg)' : 'var(--accent-bg)',
                          color: comm.status === 'CLICKED' ? 'var(--success)' : comm.status === 'FAILED' ? 'var(--danger)' : comm.status === 'DELIVERED' ? 'var(--info)' : 'var(--accent-light)',
                        }}>
                          {comm.status}
                        </span>
                      </td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {comm.sentAt ? new Date(comm.sentAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      ) : campaign.status === 'DRAFT' ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Rocket size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Ready to launch</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              This campaign targets <strong style={{ color: 'var(--text-secondary)' }}>{campaign.segment?.size || 0}</strong> customers.
              Analytics will appear here once launched.
            </div>
            <Button onClick={handleLaunch} variant="primary" loading={launching}>
              <Rocket size={14} /> Launch Now
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
            <Spinner />
            <div style={{ marginTop: 12 }}>Waiting for delivery data...</div>
          </div>
        </Card>
      )}
    </div>
  );
}
