'use client';
import { useEffect, useState } from 'react';
import { Users, ShoppingBag, Megaphone, TrendingUp, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { api, DashboardData, OrderStats } from '@/lib/api';
import { MetricCard, Card, Badge, StatusBadge, Button, Spinner, EmptyState, ProgressBar } from '@/components/ui';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function fmt(n?: number) {
  if (n == null || isNaN(n)) return '₹0';
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function pct(n: number) { return `${(n * 100).toFixed(1)}%`; }

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [d, o] = await Promise.all([api.getDashboard(), api.getOrderStats()]);
      setData(d);
      setOrderStats(o);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      await api.importSampleData();
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spinner size={32} />
    </div>
  );

  const noData = !data || data.customerCount === 0;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }} className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            Good morning 👋
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
            Here&apos;s what&apos;s happening with your shoppers today.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={load} variant="ghost" size="sm">
            <RefreshCw size={13} /> Refresh
          </Button>
          {noData && (
            <Button onClick={handleImport} variant="primary" size="sm" loading={importing}>
              <Sparkles size={13} /> Import Sample Data
            </Button>
          )}
        </div>
      </div>

      {noData ? (
        <EmptyState
          icon={<Sparkles />}
          title="Welcome to XenoAI"
          description="Import sample data to see your dashboard come to life with real customer insights."
          action={
            <Button onClick={handleImport} variant="primary" loading={importing}>
              <Sparkles size={14} /> Import 200 Sample Customers
            </Button>
          }
        />
      ) : (
        <>
          {/* Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            <MetricCard
              label="Total Customers"
              value={data!.customerCount.toLocaleString()}
              icon={<Users size={16} />}
              sub="across all segments"
            />
            <MetricCard
              label="Total Orders"
              value={data!.orderCount.toLocaleString()}
              icon={<ShoppingBag size={16} />}
              sub={orderStats ? `Avg ${fmt(orderStats.avgOrderValue)}` : ''}
            />
            <MetricCard
              label="Revenue"
              value={fmt(data!.totalRevenue)}
              icon={<TrendingUp size={16} />}
              sub="lifetime value"
            />
            <MetricCard
              label="Campaigns"
              value={data!.campaigns.total || 0}
              icon={<Megaphone size={16} />}
              sub={`${data!.campaigns.RUNNING || 0} running`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, marginBottom: 16 }}>
            {/* Revenue chart */}
            <Card>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>Revenue Over Time</div>
              {orderStats?.revenueByDate?.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={orderStats.revenueByDate}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#7c6fcd" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#7c6fcd" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmt(v)} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#7c6fcd" strokeWidth={2} fill="url(#grad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                  No order data yet
                </div>
              )}
            </Card>

            {/* Top Segments */}
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Top Segments</div>
                <Link href="/segments" style={{ fontSize: 11, color: 'var(--accent-light)', textDecoration: 'none' }}>View all →</Link>
              </div>
              {data!.topSegments.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data!.topSegments.map((seg, i) => (
                    <div key={seg.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{seg.name}</span>
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{seg.size}</span>
                      </div>
                      <ProgressBar value={seg.size / (data!.customerCount || 1)} color={i === 0 ? 'var(--accent)' : 'var(--text-muted)'} />
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                  No segments yet. <Link href="/segments" style={{ color: 'var(--accent-light)' }}>Create one →</Link>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Campaigns</div>
              <Link href="/campaigns">
                <Button variant="ghost" size="sm"><ArrowRight size={13} /> View all</Button>
              </Link>
            </div>
            {data!.recentCampaigns.length ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Campaign', 'Status', 'Sent', 'Delivered', 'Opened', 'Clicked'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, padding: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data!.recentCampaigns.map((c) => (
                    <tr key={c.id}>
                      <td style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                        <Link href={`/campaigns/${c.id}`} style={{ fontSize: 13, color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500 }}>
                          {c.name}
                        </Link>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.channel}</div>
                      </td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)' }}><StatusBadge status={c.status} /></td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>{c.analytics?.totalSent || 0}</td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {c.analytics ? pct(c.analytics.delivered / (c.analytics.totalSent || 1)) : '—'}
                      </td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {c.analytics ? pct(c.analytics.opened / (c.analytics.delivered || 1)) : '—'}
                      </td>
                      <td style={{ padding: '8px 8px', borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {c.analytics ? pct(c.analytics.clicked / (c.analytics.opened || 1)) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: 'var(--text-muted)' }}>
                No campaigns yet. <Link href="/campaigns" style={{ color: 'var(--accent-light)' }}>Create one →</Link>
              </div>
            )}
          </Card>

          {/* AI Copilot CTA */}
          <div style={{
            marginTop: 16,
            background: 'linear-gradient(135deg, rgba(124,111,205,0.15), rgba(167,139,250,0.08))',
            border: '1px solid rgba(124,111,205,0.2)',
            borderRadius: 12, padding: '20px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                <Sparkles size={14} style={{ display: 'inline', marginRight: 6, color: 'var(--accent-light)' }} />
                AI Copilot is ready
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Ask me to create segments, launch campaigns, or analyze performance — all in natural language.
              </div>
            </div>
            <Link href="/copilot">
              <Button variant="primary">Open Copilot →</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
