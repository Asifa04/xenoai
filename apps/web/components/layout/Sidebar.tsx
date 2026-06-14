'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Target, Megaphone, Sparkles, Zap } from 'lucide-react';

const NAV = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/customers', icon: Users, label: 'Customers' },
  { href: '/segments', icon: Target, label: 'Segments' },
  { href: '/campaigns', icon: Megaphone, label: 'Campaigns' },
  { href: '/copilot', icon: Sparkles, label: 'AI Copilot', highlight: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 0 16px',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #7c6fcd, #a78bfa)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>XenoAI</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Marketing Copilot</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '4px 10px' }}>
        {NAV.map(({ href, icon: Icon, label, highlight }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                marginBottom: 2,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: active ? 'var(--accent-bg)' : highlight && !active ? 'rgba(124,111,205,0.05)' : 'transparent',
                color: active ? 'var(--accent-light)' : highlight ? 'var(--accent-light)' : 'var(--text-secondary)',
                border: active ? '1px solid rgba(124,111,205,0.2)' : '1px solid transparent',
              }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-card-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLDivElement).style.background = highlight ? 'rgba(124,111,205,0.05)' : 'transparent';
                }}
              >
                <Icon size={16} />
                <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{label}</span>
                {highlight && (
                  <span style={{
                    marginLeft: 'auto',
                    fontSize: 9,
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #7c6fcd, #a78bfa)',
                    color: 'white',
                    padding: '1px 5px',
                    borderRadius: 4,
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                  }}>AI</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom info */}
      <div style={{
        margin: '0 10px',
        padding: '10px 10px',
        background: 'var(--accent-bg)',
        borderRadius: 8,
        border: '1px solid rgba(124,111,205,0.15)',
      }}>
        <div style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 500, marginBottom: 2 }}>Built for Xeno</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.4 }}>AI-native CRM · Two-service architecture</div>
      </div>
    </aside>
  );
}
