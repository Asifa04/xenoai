'use client';
import React from 'react';
import { Loader2 } from 'lucide-react';

// Card
export function Card({ children, style, onMouseEnter, onMouseLeave, onClick }: {
  children: React.ReactNode;
  style?: React.CSSProperties;
  onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Badge
export function Badge({ children, color = 'default' }: { children: React.ReactNode; color?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' }) {
  const colors = {
    default: { bg: 'rgba(255,255,255,0.06)', text: 'var(--text-secondary)' },
    success: { bg: 'var(--success-bg)', text: 'var(--success)' },
    warning: { bg: 'var(--warning-bg)', text: 'var(--warning)' },
    danger:  { bg: 'var(--danger-bg)',  text: 'var(--danger)' },
    info:    { bg: 'var(--info-bg)',    text: 'var(--info)' },
    purple:  { bg: 'var(--accent-bg)', text: 'var(--accent-light)' },
  };
  const c = colors[color];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 8px', borderRadius: 100,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      background: c.bg, color: c.text,
    }}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
    DRAFT:     { label: 'Draft',     color: 'default' },
    RUNNING:   { label: 'Running',   color: 'info' },
    COMPLETED: { label: 'Completed', color: 'success' },
    FAILED:    { label: 'Failed',    color: 'danger' },
  };
  const s = map[status] || { label: status, color: 'default' as const };
  return <Badge color={s.color}>{s.label}</Badge>;
}

export function Button({
  children, onClick, variant = 'default', size = 'md', disabled, loading, style, type = 'button',
}: {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
}) {
  const variants = {
    default: { bg: 'var(--bg-card-hover)', border: 'var(--border-strong)', text: 'var(--text-primary)' },
    primary: { bg: 'var(--accent)',        border: 'transparent',          text: 'white' },
    ghost:   { bg: 'transparent',          border: 'transparent',          text: 'var(--text-secondary)' },
    danger:  { bg: 'var(--danger-bg)',     border: 'rgba(248,113,113,0.2)',text: 'var(--danger)' },
  };
  const sizes = {
    sm: { padding: '5px 10px',  fontSize: 12 },
    md: { padding: '7px 14px',  fontSize: 13 },
    lg: { padding: '10px 20px', fontSize: 14 },
  };
  const v = variants[variant];
  const s = sizes[size];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: s.padding, fontSize: s.fontSize, fontWeight: 500,
        background: v.bg, border: `1px solid ${v.border}`, borderRadius: 8,
        color: v.text, cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'all 0.15s', whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
      {children}
    </button>
  );
}

export function Input({ value, onChange, placeholder, type = 'text', style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', padding: '8px 12px', fontSize: 13,
        background: 'var(--bg)', border: '1px solid var(--border-strong)',
        borderRadius: 8, color: 'var(--text-primary)', outline: 'none',
        transition: 'border-color 0.15s', ...style,
      }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={(e)  => (e.target.style.borderColor = 'var(--border-strong)')}
    />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3, style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; style?: React.CSSProperties;
}) {
  return (
    <textarea
      value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{
        width: '100%', padding: '8px 12px', fontSize: 13,
        background: 'var(--bg)', border: '1px solid var(--border-strong)',
        borderRadius: 8, color: 'var(--text-primary)', outline: 'none',
        resize: 'vertical', fontFamily: 'inherit',
        transition: 'border-color 0.15s', ...style,
      }}
      onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
      onBlur={(e)  => (e.target.style.borderColor = 'var(--border-strong)')}
    />
  );
}

export function Select({ value, onChange, options, style }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; style?: React.CSSProperties;
}) {
  return (
    <select
      value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%', padding: '8px 12px', fontSize: 13,
        background: 'var(--bg)', border: '1px solid var(--border-strong)',
        borderRadius: 8, color: 'var(--text-primary)', outline: 'none', cursor: 'pointer',
        ...style,
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: 'var(--bg-card)' }}>{o.label}</option>
      ))}
    </select>
  );
}

export function MetricCard({ label, value, sub, icon }: {
  label: string; value: string | number; sub?: string; icon?: React.ReactNode;
}) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '16px 20px', transition: 'border-color 0.15s',
    }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)')}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        {icon && <span style={{ color: 'var(--text-muted)' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ padding: '28px 32px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 size={size} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />;
}

export function EmptyState({ icon, title, description, action }: {
  icon: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 32px', textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 280, lineHeight: 1.6 }}>{description}</div>}
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}

export function ProgressBar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div style={{ background: 'var(--border)', borderRadius: 100, height: 4, overflow: 'hidden' }}>
      <div style={{
        width: `${Math.min(100, Math.max(0, value * 100))}%`,
        background: color, height: '100%', borderRadius: 100, transition: 'width 0.5s ease',
      }} />
    </div>
  );
}
