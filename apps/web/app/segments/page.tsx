'use client';
import { useEffect, useState } from 'react';
import { Plus, Sparkles, Target, Trash2, Users, Wand2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { api, Segment, SegmentRules, SegmentCondition } from '@/lib/api';
import { PageHeader, Card, Button, Input, Textarea, Select, Spinner, EmptyState } from '@/components/ui';

const FIELD_OPTIONS = [
  { value: 'totalSpend',        label: 'Total Spend (₹)' },
  { value: 'orderCount',        label: 'Order Count' },
  { value: 'daysSinceLastOrder',label: 'Days Since Last Order' },
  { value: 'daysSinceSignup',   label: 'Days Since Signup' },
  { value: 'city',              label: 'City' },
  { value: 'gender',            label: 'Gender' },
];
const OP_OPTIONS = [
  { value: 'gt',  label: '>' }, { value: 'gte', label: '>=' },
  { value: 'lt',  label: '<' }, { value: 'lte', label: '<=' },
  { value: 'eq',  label: '=' },
];

type Mode = 'list' | 'builder' | 'ai';
type PreviewResult = { count: number; sample: { id?: string; name?: string; email?: string; city?: string }[] };

function ConditionRow({ cond, onChange, onRemove }: {
  cond: SegmentCondition;
  onChange: (c: SegmentCondition) => void;
  onRemove: () => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <Select value={cond.field} onChange={(v) => onChange({ ...cond, field: v })} options={FIELD_OPTIONS} style={{ flex: 2 }} />
      <Select value={cond.op}    onChange={(v) => onChange({ ...cond, op: v })}    options={OP_OPTIONS}   style={{ flex: 1 }} />
      <Input  value={String(cond.value)}
              onChange={(v) => onChange({ ...cond, value: isNaN(Number(v)) ? v : Number(v) })}
              placeholder="value" style={{ flex: 1 }} />
      <button onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: 4 }}>
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function SegmentsPage() {
  const [segments, setSegments]     = useState<Segment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [mode, setMode]             = useState<Mode>('list');
  const [saving, setSaving]         = useState(false);

  // Builder state
  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [operator, setOperator]     = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SegmentCondition[]>([{ field: 'totalSpend', op: 'gt', value: 5000 }]);
  const [preview, setPreview]       = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  // AI state
  const [aiPrompt, setAiPrompt]   = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult]   = useState<{ segment: Segment } | null>(null);

  async function load() {
    setLoading(true);
    try { setSegments(await api.getSegments()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function handlePreview() {
    setPreviewing(true);
    try {
      const rules: SegmentRules = { operator, conditions };
      const res = await api.previewSegment(rules);
      setPreview({ count: res.count, sample: res.sample as PreviewResult['sample'] });
    } catch (e) { console.error(e); }
    finally { setPreviewing(false); }
  }

  async function handleSaveManual() {
    if (!name || !conditions.length) return;
    setSaving(true);
    try {
      await api.createSegment({ name, description, rules: { operator, conditions } });
      setMode('list'); setName(''); setDescription(''); setPreview(null);
      setConditions([{ field: 'totalSpend', op: 'gt', value: 5000 }]);
      await load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  }

  async function handleAiCreate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const result = await api.createAiSegment(aiPrompt);
      setAiResult(result); await load();
    } catch (e) { console.error(e); }
    finally { setAiLoading(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this segment?')) return;
    await api.deleteSegment(id); await load();
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100 }} className="animate-fade-in">
      <PageHeader
        title="Segments"
        subtitle="Define your target audiences"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={() => setMode(mode === 'builder' ? 'list' : 'builder')} variant="default" size="sm">
              <Plus size={13} /> Manual Builder
            </Button>
            <Button onClick={() => setMode(mode === 'ai' ? 'list' : 'ai')} variant="primary" size="sm">
              <Sparkles size={13} /> AI Builder
            </Button>
          </div>
        }
      />

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* AI Builder Panel */}
        {mode === 'ai' && (
          <Card style={{ border: '1px solid rgba(124,111,205,0.3)', background: 'linear-gradient(135deg,rgba(124,111,205,0.08),var(--bg-card))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Sparkles size={16} color="var(--accent-light)" />
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>Describe your audience</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Try: &quot;Customers who spent over ₹5000 and haven&apos;t purchased in 60 days&quot;
            </div>
            <Textarea value={aiPrompt} onChange={setAiPrompt}
              placeholder="Describe the segment you want to create in plain English..." rows={3} />
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              {['High spenders inactive 90d','New customers last 30d','Frequent buyers 5+ orders','Mumbai customers'].map((s) => (
                <button key={s} onClick={() => setAiPrompt(s)}
                  style={{ fontSize: 11, padding: '4px 10px', borderRadius: 100, border: '1px solid var(--border-strong)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <Button onClick={handleAiCreate} variant="primary" loading={aiLoading} disabled={!aiPrompt.trim()}>
                <Wand2 size={13} /> Generate Segment
              </Button>
              {aiLoading && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>AI is analysing your data...</span>}
            </div>
            {aiResult && (
              <div style={{ marginTop: 16, padding: '14px', background: 'var(--success-bg)', borderRadius: 8, border: '1px solid rgba(74,222,128,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>
                  ✓ Segment created: &quot;{aiResult.segment.name}&quot;
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  {aiResult.segment.description} · <strong>{aiResult.segment.size}</strong> customers matched
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Manual Builder Panel */}
        {mode === 'builder' && (
          <Card>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>Build Segment Manually</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Segment Name *</label>
                  <Input value={name} onChange={setName} placeholder="e.g. High Value Customers" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Description</label>
                  <Input value={description} onChange={setDescription} placeholder="Optional description" />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Match</span>
                <Select value={operator} onChange={(v) => setOperator(v as 'AND' | 'OR')}
                  options={[{ value: 'AND', label: 'ALL conditions' }, { value: 'OR', label: 'ANY condition' }]}
                  style={{ width: 160 }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {conditions.map((cond, i) => (
                  <ConditionRow key={i} cond={cond}
                    onChange={(c) => setConditions(conditions.map((x, j) => j === i ? c : x))}
                    onRemove={() => setConditions(conditions.filter((_, j) => j !== i))} />
                ))}
                <Button variant="ghost" size="sm"
                  onClick={() => setConditions([...conditions, { field: 'totalSpend', op: 'gt', value: 1000 }])}>
                  <Plus size={13} /> Add Condition
                </Button>
              </div>
              {preview && (
                <div style={{ padding: '12px 14px', background: 'var(--accent-bg)', borderRadius: 8, border: '1px solid rgba(124,111,205,0.15)' }}>
                  <span style={{ fontSize: 13, color: 'var(--accent-light)', fontWeight: 600 }}>{preview.count} customers</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>match these rules</span>
                  {preview.sample.length > 0 && (
                    <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
                      Sample: {preview.sample.map(s => s.name).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={handlePreview} variant="default" loading={previewing} disabled={!conditions.length}>Preview</Button>
                <Button onClick={handleSaveManual} variant="primary" loading={saving} disabled={!name || !conditions.length}>Save Segment</Button>
                <Button onClick={() => setMode('list')} variant="ghost">Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Segments list */}
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}><Spinner /></div>
        ) : segments.length === 0 ? (
          <EmptyState icon={<Target />} title="No segments yet" description="Create your first segment manually or let AI do it for you."
            action={
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => setMode('builder')} variant="default"><Plus size={13} /> Manual</Button>
                <Button onClick={() => setMode('ai')} variant="primary"><Sparkles size={13} /> AI Builder</Button>
              </div>
            } />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px,1fr))', gap: 12 }}>
            {segments.map((seg) => (
              <Card key={seg.id} style={{ padding: '16px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{seg.name}</div>
                    {seg.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{seg.description}</div>}
                  </div>
                  <button onClick={() => handleDelete(seg.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, marginLeft: 8 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                {seg.aiPrompt && (
                  <div style={{ fontSize: 11, color: 'var(--accent-light)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Sparkles size={10} /> AI-generated
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{seg.size.toLocaleString()}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>customers</span>
                  </div>
                  <Link href={`/campaigns?segmentId=${seg.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">Campaign <ChevronRight size={12} /></Button>
                  </Link>
                </div>
                <div style={{ marginTop: 8, fontSize: 10, color: 'var(--text-muted)' }}>
                  Created {new Date(seg.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
