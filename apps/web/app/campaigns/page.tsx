'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, Sparkles, Megaphone, Rocket, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { api, Campaign, Segment } from '@/lib/api';
import { PageHeader, Card, Button, Input, Textarea, Select, StatusBadge, Spinner, EmptyState, Badge } from '@/components/ui';

type Mode = 'list' | 'create';

function CampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedSegment = searchParams.get('segmentId') || '';

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(preselectedSegment ? 'create' : 'list');

  // Form state
  const [name, setName] = useState('');
  const [segmentId, setSegmentId] = useState(preselectedSegment);
  const [channel, setChannel] = useState<'EMAIL' | 'SMS' | 'WHATSAPP'>('EMAIL');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);

  // AI generation
  const [aiGoal, setAiGoal] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');
  const [showAi, setShowAi] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([api.getCampaigns(), api.getSegments()]);
      setCampaigns(c);
      setSegments(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleAiGenerate() {
    if (!aiGoal.trim()) return;
    setAiLoading(true);
    try {
      const seg = segments.find((s) => s.id === segmentId);
      const draft = await api.createAiCampaign(aiGoal, segmentId || undefined);
      setName(draft.name);
      setChannel(draft.channel);
      setMessage(draft.message);
      setAiReasoning(draft.reasoning);
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  }

  async function handleSave() {
    if (!name || !segmentId || !message) return;
    setSaving(true);
    try {
      const campaign = await api.createCampaign({ name, segmentId, channel, message });
      setMode('list');
      resetForm();
      await load();
      router.push(`/campaigns/${campaign.id}`);
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleLaunch(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Launch this campaign? This will start sending messages.')) return;
    setLaunching(id);
    try {
      const res = await api.launchCampaign(id);
      alert(`🚀 Campaign launched! ${res.recipientCount} messages queued.`);
      await load();
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setLaunching(null);
    }
  }

  function resetForm() {
    setName(''); setSegmentId(''); setChannel('EMAIL'); setMessage('');
    setAiGoal(''); setAiReasoning(''); setShowAi(false);
  }

  const channelIcon = { EMAIL: '✉️', SMS: '💬', WHATSAPP: '📱' };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }} className="animate-fade-in">
      <PageHeader
        title="Campaigns"
        subtitle="Reach your segments with personalized messages"
        action={
          <Button onClick={() => { setMode(mode === 'create' ? 'list' : 'create'); resetForm(); }} variant="primary" size="sm">
            <Plus size={13} /> New Campaign
          </Button>
        }
      />

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Create Campaign Form */}
        {mode === 'create' && (
          <Card style={{ border: '1px solid var(--border-strong)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>
              Create Campaign
            </div>

            {/* AI generator toggle */}
            <div style={{
              marginBottom: 20, padding: '14px', borderRadius: 8,
              background: showAi ? 'linear-gradient(135deg, rgba(124,111,205,0.12), rgba(124,111,205,0.05))' : 'var(--bg)',
              border: '1px solid ' + (showAi ? 'rgba(124,111,205,0.3)' : 'var(--border)'),
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showAi ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Sparkles size={14} color="var(--accent-light)" />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Generate with AI</span>
                </div>
                <Button onClick={() => setShowAi(!showAi)} variant="ghost" size="sm">
                  {showAi ? 'Hide' : 'Use AI'}
                </Button>
              </div>
              {showAi && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Input value={aiGoal} onChange={setAiGoal} placeholder='e.g. "Win back inactive shoppers with a discount"' />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {['Bring back inactive customers', 'Reward high spenders', 'Welcome new signups', 'Flash sale announcement'].map((s) => (
                      <button key={s} onClick={() => setAiGoal(s)}
                        style={{ fontSize: 11, padding: '3px 9px', borderRadius: 100, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleAiGenerate} variant="primary" size="sm" loading={aiLoading} disabled={!aiGoal.trim()}>
                    <Wand2 size={13} /> Generate
                  </Button>
                  {aiReasoning && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', padding: '8px 0' }}>
                      💡 {aiReasoning}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Campaign Name *</label>
                  <Input value={name} onChange={setName} placeholder="e.g. Win-Back Summer 2025" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Target Segment *</label>
                  <Select
                    value={segmentId}
                    onChange={setSegmentId}
                    options={[{ value: '', label: 'Select a segment...' }, ...segments.map((s) => ({ value: s.id, label: `${s.name} (${s.size})` }))]}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Channel</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['EMAIL', 'SMS', 'WHATSAPP'] as const).map((ch) => (
                    <button key={ch} onClick={() => setChannel(ch)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                        background: channel === ch ? 'var(--accent-bg)' : 'transparent',
                        border: `1px solid ${channel === ch ? 'rgba(124,111,205,0.3)' : 'var(--border)'}`,
                        color: channel === ch ? 'var(--accent-light)' : 'var(--text-secondary)',
                        fontWeight: channel === ch ? 500 : 400,
                      }}>
                      {channelIcon[ch]} {ch}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Message * <span style={{ color: 'var(--accent-light)' }}>— use {'{{name}}'} for personalization</span>
                </label>
                <Textarea value={message} onChange={setMessage}
                  placeholder={`Hi {{name}}, we have something special for you! 🎉`} rows={4} />
                {message && (
                  <div style={{ marginTop: 8, padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Preview:</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {message.replace('{{name}}', 'Priya')}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{message.length} chars</div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <Button onClick={handleSave} variant="primary" loading={saving} disabled={!name || !segmentId || !message}>
                  Save as Draft
                </Button>
                <Button onClick={() => { setMode('list'); resetForm(); }} variant="ghost">Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Campaign List */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}><Spinner /></div>
        ) : campaigns.length === 0 && mode !== 'create' ? (
          <EmptyState
            icon={<Megaphone />}
            title="No campaigns yet"
            description="Create your first campaign to start reaching your shoppers."
            action={<Button onClick={() => setMode('create')} variant="primary"><Plus size={13} /> Create Campaign</Button>}
          />
        ) : campaigns.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {campaigns.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} style={{ textDecoration: 'none' }}>
                <Card style={{ padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</span>
                        <StatusBadge status={c.status} />
                        <Badge color="default">{channelIcon[c.channel]} {c.channel}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {c.segment?.name} · {c.segment?.size || 0} recipients
                        {c.sentAt && ` · Sent ${new Date(c.sentAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 16 }}>
                      {c.analytics && c.analytics.totalSent > 0 && (
                        <div style={{ display: 'flex', gap: 20 }}>
                          {[
                            { label: 'Sent', value: c.analytics.totalSent },
                            { label: 'Open', value: `${((c.analytics.opened / (c.analytics.delivered || 1)) * 100).toFixed(0)}%` },
                            { label: 'Click', value: `${((c.analytics.clicked / (c.analytics.opened || 1)) * 100).toFixed(0)}%` },
                          ].map((m) => (
                            <div key={m.label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{m.value}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{m.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {c.status === 'DRAFT' && (
                      <Button
                        onClick={(e) => { handleLaunch(c.id, e); }}
                        variant="primary" size="sm"
                        loading={launching === c.id}
                      >
                        <Rocket size={13} /> Launch
                      </Button>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><Spinner /></div>}>
      <CampaignsContent />
    </Suspense>
  );
}
