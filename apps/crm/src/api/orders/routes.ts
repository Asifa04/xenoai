import { Router } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = Router();

router.get('/stats', async (_req, res) => {
  try {
    const [stats] = (await db.execute(sql`
      SELECT COUNT(*)::int AS total, 
             COALESCE(SUM(order_amount), 0)::float AS total_revenue,
             COALESCE(AVG(order_amount), 0)::float AS avg_order_value
      FROM orders
    `)).rows as any[];

    const byDate = (await db.execute(sql`
      SELECT DATE(order_date)::text AS date, SUM(order_amount)::float AS revenue
      FROM orders
      WHERE order_date >= NOW() - INTERVAL '60 days'
      GROUP BY DATE(order_date)
      ORDER BY date ASC
    `)).rows;

    res.json({ ...stats, revenueByDate: byDate });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch order stats' }); }
});

router.get('/', async (req, res) => {
  try {
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const rows = (await db.execute(sql`
      SELECT o.*, c.name AS customer_name, c.email AS customer_email
      FROM orders o JOIN customers c ON c.id = o.customer_id
      ORDER BY o.order_date DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `)).rows;
    const [{ total }] = (await db.execute(sql`SELECT COUNT(*)::int AS total FROM orders`)).rows as any[];
    res.json({ orders: rows, total });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

export default router;
