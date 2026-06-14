const BASE = process.env.NEXT_PUBLIC_CRM_URL || 'http://localhost:4000';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Customers
  getCustomers: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return req<{ customers: Customer[]; total: number; page: number; limit: number }>(`/api/customers${qs}`);
  },
  getCustomer: (id: string) => req<Customer>(`/api/customers/${id}`),
  importSampleData: () => req<{ message: string; count: number }>('/api/customers/import', { method: 'POST' }),
  getCustomerStats: () => req<{ total: number; topCities: { city: string; _count: { id: number } }[] }>('/api/customers/stats'),

  // Orders
  getOrderStats: () => req<OrderStats>('/api/orders/stats'),

  // Segments
  getSegments: () => req<Segment[]>('/api/segments'),
  getSegment: (id: string) => req<Segment>(`/api/segments/${id}`),
  getSegmentCustomers: (id: string, params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return req<{ customers: Customer[]; total: number }>(`/api/segments/${id}/customers${qs}`);
  },
  createSegment: (data: Partial<Segment>) => req<Segment>('/api/segments', { method: 'POST', body: JSON.stringify(data) }),
  createAiSegment: (prompt: string) => req<{ segment: Segment; customerIds: string[] }>('/api/segments/ai', { method: 'POST', body: JSON.stringify({ prompt }) }),
  previewSegment: (rules: SegmentRules) => req<{ count: number; sample: Partial<Customer>[] }>('/api/segments/preview', { method: 'POST', body: JSON.stringify({ rules }) }),
  deleteSegment: (id: string) => req<{ success: boolean }>(`/api/segments/${id}`, { method: 'DELETE' }),

  // Campaigns
  getCampaigns: () => req<Campaign[]>('/api/campaigns'),
  getCampaign: (id: string) => req<Campaign>(`/api/campaigns/${id}`),
  createCampaign: (data: Partial<Campaign>) => req<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  createAiCampaign: (goal: string, segmentId?: string) => req<AiCampaignDraft>('/api/campaigns/ai', { method: 'POST', body: JSON.stringify({ goal, segmentId }) }),
  launchCampaign: (id: string) => req<{ success: boolean; recipientCount: number }>(`/api/campaigns/${id}/launch`, { method: 'POST' }),
  analyzeCampaign: (id: string) => req<{ analysis: string }>(`/api/campaigns/${id}/analyze`, { method: 'POST' }),

  // Analytics
  getDashboard: () => req<DashboardData>('/api/analytics/dashboard'),
  getCampaignAnalytics: (id: string) => req<CampaignAnalytics>(`/api/analytics/${id}`),
};

// Types
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  gender?: string;
  signupDate: string;
  createdAt: string;
  orderCount?: number;
  totalSpend?: number;
  orders?: Order[];
  daysSinceLastOrder?: number | null;
}

export interface Order {
  id: string;
  customerId: string;
  orderAmount: number;
  orderDate: string;
  products: string[];
}

export interface SegmentCondition {
  field: string;
  op: string;
  value: number | string | string[];
}

export interface SegmentRules {
  operator: 'AND' | 'OR';
  conditions: SegmentCondition[];
}

export interface Segment {
  id: string;
  name: string;
  description?: string;
  rules: SegmentRules;
  aiPrompt?: string;
  size: number;
  createdAt: string;
  campaigns?: Campaign[];
}

export interface Campaign {
  id: string;
  name: string;
  segmentId: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  message: string;
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  segment?: Segment;
  analytics?: CampaignAnalytics;
  _count?: { communications: number };
}

export interface CampaignAnalytics {
  id: string;
  campaignId: string;
  totalSent: number;
  delivered: number;
  failed: number;
  opened: number;
  read: number;
  clicked: number;
  conversions: number;
  deliveryRate?: number;
  openRate?: number;
  clickRate?: number;
  conversionRate?: number;
}

export interface DashboardData {
  customerCount: number;
  orderCount: number;
  totalRevenue: number;
  campaigns: { total: number; DRAFT?: number; RUNNING?: number; COMPLETED?: number };
  recentCampaigns: Campaign[];
  topSegments: { id: string; name: string; size: number }[];
}

export interface OrderStats {
  total: number;
  totalRevenue: number;
  avgOrderValue: number;
  revenueByDate: { date: string; revenue: number }[];
}

export interface AiCampaignDraft {
  name: string;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  message: string;
  reasoning: string;
}
