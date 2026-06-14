import { Router } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/dashboard', async (_req, res) => {
  try {
    const [customers] = (await db.execute(sql`SELECT COUNT(*)::int AS count FROM customers`)).rows as any[];
    const [orders] = (await db.execute(sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(order_amount),0)::float AS revenue FROM orders`)).rows as any[];
    const campaignStats = (await db.execute(sql`SELECT status, COUNT(*)::int AS count FROM campaigns GROUP BY status`)).rows as any[];
    const recentCampaigns = (await db.execute(sql`
      SELECT c.*, s.name AS segment_name, a.total_sent, a.delivered, a.opened, a.clicked, a.conversions
      FROM campaigns c LEFT JOIN segments s ON s.id = c.segment_id
      LEFT JOIN campaign_analytics a ON a.campaign_id = c.id
      ORDER BY c.created_at DESC LIMIT 5
    `)).rows as any[];
    const topSegments = (await db.execute(sql`SELECT id, name, size FROM segments ORDER BY size DESC LIMIT 5`)).rows;

    const statusMap = campaignStats.reduce((acc: any, r: any) => ({ ...acc, [r.status]: r.count }), {});
    res.json({
      customerCount: customers.count,
      orderCount: orders.count,
      totalRevenue: orders.revenue,
      campaigns: { total: Object.values(statusMap).reduce((a: any, b: any) => a + b, 0), ...statusMap },
      recentCampaigns: recentCampaigns.map(r => ({
        ...r,
        segment: { name: r.segment_name },
        analytics: r.total_sent != null ? { totalSent: r.total_sent, delivered: r.delivered, opened: r.opened, clicked: r.clicked, conversions: r.conversions } : null,
      })),
      topSegments,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch dashboard' }); }
});

router.get('/:campaignId', async (req, res) => {
  try {
    const rows = (await db.execute(sql`
      SELECT a.*, c.name, c.channel, c.status FROM campaign_analytics a
      JOIN campaigns c ON c.id = a.campaign_id
      WHERE a.campaign_id = ${req.params.campaignId}
    `)).rows;
    if (!rows.length) return res.status(404).json({ error: 'Analytics not found' });
    const a = rows[0] as any;
    const totalSent = a.total_sent || 0;
    const delivered = a.delivered || 0;
    const opened = a.opened || 0;
    res.json({
      ...a,
      totalSent,
      deliveryRate: totalSent ? delivered / totalSent : 0,
      openRate: delivered ? opened / delivered : 0,
      clickRate: opened ? (a.clicked || 0) / opened : 0,
      conversionRate: totalSent ? (a.conversions || 0) / totalSent : 0,
    });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch analytics' }); }
});

export default router;
