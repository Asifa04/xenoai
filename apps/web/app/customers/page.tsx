'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, MapPin } from 'lucide-react';
import { api, Customer } from '@/lib/api';
import { PageHeader, Card, Button, Input, Select, Spinner, EmptyState } from '@/components/ui';

function fmt(n: number) {
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

/** Handle both camelCase (signupDate) and snake_case (signup_date) from the API */
function getDate(c: Customer): string {
  const raw = (c as any).signupDate || (c as any).signup_date;
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const CITIES = [
  { value: '', label: 'All Cities' },
  ...['Mumbai','Delhi','Bangalore','Chennai','Hyderabad','Pune','Kolkata','Jaipur','Ahmedabad','Surat']
    .map(c => ({ value: c, label: c })),
];

const GENDERS = [
  { value: '',       label: 'All Genders' },
  { value: 'Male',   label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other',  label: 'Other' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [city, setCity]           = useState('');
  const [gender, setGender]       = useState('');
  const [page, setPage]           = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(page), limit: '25' };
      if (search) params.search = search;
      if (city)   params.city   = city;
      if (gender) params.gender = gender;
      const res = await api.getCustomers(params);
      setCustomers(res.customers);
      setTotal(res.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, city, gender, page]);

  useEffect(() => {
    const t = setTimeout(load, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [load]);

  function handleClear() {
    setSearch(''); setCity(''); setGender(''); setPage(1);
  }

  const totalPages = Math.ceil(total / 25);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }} className="animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle={`${total.toLocaleString()} shoppers in your database`}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, margin: '20px 0', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 340 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <Input
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name, email, phone…"
            style={{ paddingLeft: 32 }}
          />
        </div>
        <Select value={city}   onChange={(v) => { setCity(v);   setPage(1); }} options={CITIES}   style={{ width: 150 }} />
        <Select value={gender} onChange={(v) => { setGender(v); setPage(1); }} options={GENDERS}  style={{ width: 140 }} />
        {(search || city || gender) && (
          <Button variant="ghost" size="sm" onClick={handleClear}>Clear</Button>
        )}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
            <Spinner />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState icon={<Users />} title="No customers found" description="Try adjusting your search or filters." />
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  {['Customer', 'City', 'Gender', 'Orders', 'Total Spend', 'Joined'].map((h) => (
                    <th key={h} style={{
                      textAlign: 'left', fontSize: 11, color: 'var(--text-muted)',
                      fontWeight: 500, padding: '10px 16px',
                      textTransform: 'uppercase', letterSpacing: '0.5px',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/customers/${c.id}`)}
                    style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Customer */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: `hsl(${c.name.charCodeAt(0) * 13 % 360}, 40%, 25%)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600,
                          color: `hsl(${c.name.charCodeAt(0) * 13 % 360}, 70%, 75%)`,
                        }}>
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    {/* City */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      {c.city
                        ? <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={11} />{c.city}</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                    </td>
                    {/* Gender */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{c.gender || '—'}</span>
                    </td>
                    {/* Orders */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {(c as any).orderCount ?? 0}
                      </span>
                    </td>
                    {/* Spend */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                        {fmt((c as any).totalSpend ?? 0)}
                      </span>
                    </td>
                    {/* Joined */}
                    <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getDate(c)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages} · {total} customers
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Button variant="default" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</Button>
                  <Button variant="default" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
