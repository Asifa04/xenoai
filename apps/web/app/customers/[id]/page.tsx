'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, ShoppingBag, TrendingUp, Clock } from 'lucide-react';
import { api, Customer } from '@/lib/api';
import { Card, Button, Badge, Spinner } from '@/components/ui';

function fmt(n: number) {
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function safeDate(raw: unknown): string {
  if (!raw) return '—';
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function safeOrderDate(raw: unknown): string {
  if (!raw) return '—';
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    api.getCustomer(id).then(setCustomer).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <Spinner />
    </div>
  );
  if (!customer) return <div style={{ padding: 32, color: 'var(--text-muted)' }}>Customer not found</div>;

  // Normalise field names — API may return snake_case or camelCase
  const c = customer as any;
  const signupDate         = c.signupDate    || c.signup_date;
  const daysSinceLastOrder = c.daysSinceLastOrder ?? c.days_since_last_order;
  const totalSpend         = c.totalSpend    ?? c.total_spend ?? 0;
  const orders             = c.orders        ?? [];
  const communications     = c.communications ?? [];
  const avgOrder           = orders.length ? totalSpend / orders.length : 0;

  const hue = customer.name.charCodeAt(0) * 13 % 360;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }} className="animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => router.back()} style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Back
      </Button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
        {/* Left */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Profile card */}
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                background: `hsl(${hue}, 40%, 20%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, fontWeight: 700, color: `hsl(${hue}, 70%, 75%)`,
              }}>
                {customer.name.charAt(0)}
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {customer.name}
                </h2>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {customer.gender && <Badge color="default">{customer.gender}</Badge>}
                  {customer.city   && <Badge color="info">{customer.city}</Badge>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Mail size={14} color="var(--text-muted)" /> {customer.email}
              </div>
              {customer.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <Phone size={14} color="var(--text-muted)" /> {customer.phone}
                </div>
              )}
              {customer.city && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <MapPin size={14} color="var(--text-muted)" /> {customer.city}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <Calendar size={14} color="var(--text-muted)" />
                Joined {safeDate(signupDate)}
              </div>
              {daysSinceLastOrder != null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
                  color: daysSinceLastOrder > 90 ? 'var(--warning)' : 'var(--text-secondary)',
                }}>
                  <Clock size={14} />
                  Last order {daysSinceLastOrder} days ago
                  {daysSinceLastOrder > 90 && <Badge color="warning">At risk</Badge>}
                </div>
              )}
            </div>
          </Card>

          {/* Order history */}
          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              Order History ({orders.length} orders)
            </div>
            {orders.length ? (
              <div>
                {orders.map((order: any, i: number) => {
                  const amount   = order.orderAmount  ?? order.order_amount  ?? 0;
                  const dateRaw  = order.orderDate    ?? order.order_date;
                  const products = Array.isArray(order.products) ? order.products : [];
                  return (
                    <div key={order.id} style={{
                      padding: '12px 0',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, marginBottom: 2 }}>
                          {products.join(', ') || 'Order'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {safeOrderDate(dateRaw)}
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {fmt(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                No orders yet
              </div>
            )}
          </Card>
        </div>

        {/* Right: metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Total Spend',      value: fmt(totalSpend), icon: <TrendingUp size={16} />, color: 'var(--success)' },
            { label: 'Total Orders',     value: String(orders.length), icon: <ShoppingBag size={16} />, color: 'var(--info)' },
            { label: 'Avg Order Value',  value: fmt(avgOrder),   icon: <TrendingUp size={16} />, color: 'var(--accent-light)' },
          ].map((m) => (
            <Card key={m.label} style={{ padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: m.color }}>{m.icon}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>
                  {m.label}
                </span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{m.value}</div>
            </Card>
          ))}

          {/* Recent communications */}
          <Card style={{ padding: '16px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>
              Recent Messages
            </div>
            {communications.length ? (
              communications.slice(0, 5).map((comm: any, i: number) => (
                <div key={comm.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>
                    {comm.campaign?.name}
                  </div>
                  <div style={{
                    fontSize: 11, fontWeight: 500,
                    color: comm.status === 'CLICKED'   ? 'var(--success)'
                         : comm.status === 'FAILED'    ? 'var(--danger)'
                         : comm.status === 'DELIVERED' ? 'var(--info)'
                         : 'var(--accent-light)',
                  }}>
                    {comm.status}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No messages sent yet</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
