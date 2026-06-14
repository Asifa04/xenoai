import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /api/customers/stats
router.get('/stats', async (_req, res) => {
  const client = await pool.connect();
  try {
    const [countRow] = (await client.query(`SELECT COUNT(*)::int AS count FROM customers`)).rows;
    const cities = (await client.query(
      `SELECT city, COUNT(*)::int AS count FROM customers WHERE city IS NOT NULL GROUP BY city ORDER BY count DESC LIMIT 5`
    )).rows;
    res.json({ total: countRow.count, topCities: cities });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  } finally { client.release(); }
});

// GET /api/customers
router.get('/', async (req, res) => {
  const client = await pool.connect();
  try {
    const { search, city, gender, page = '1', limit = '25' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build parameterised WHERE clauses to avoid binding bugs
    const conditions: string[] = [];
    const params: unknown[]   = [];
    let   pi = 1;

    if (search) {
      const s = '%' + search.toLowerCase() + '%';
      conditions.push(`(LOWER(c.name) LIKE $${pi} OR LOWER(c.email) LIKE $${pi} OR c.phone LIKE $${pi + 1})`);
      params.push(s, '%' + search + '%');
      pi += 2;
    }
    if (city) {
      conditions.push(`LOWER(c.city) = $${pi}`);
      params.push(city.toLowerCase());
      pi++;
    }
    if (gender) {
      conditions.push(`c.gender = $${pi}`);
      params.push(gender);          // exact match e.g. 'Male' or 'Female'
      pi++;
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const dataRows = (await client.query(`
      SELECT
        c.id, c.name, c.email, c.phone, c.city, c.gender,
        c.signup_date   AS "signupDate",
        c.created_at    AS "createdAt",
        COUNT(o.id)::int                              AS "orderCount",
        COALESCE(SUM(o.order_amount), 0)::float       AS "totalSpend"
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      ${where}
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT $${pi} OFFSET $${pi + 1}
    `, [...params, parseInt(limit), offset])).rows;

    const [{ total }] = (await client.query(
      `SELECT COUNT(*)::int AS total FROM customers c ${where}`,
      params
    )).rows;

    res.json({ customers: dataRows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  } finally { client.release(); }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const [customer] = (await client.query(`
      SELECT
        c.id, c.name, c.email, c.phone, c.city, c.gender,
        c.signup_date   AS "signupDate",
        c.created_at    AS "createdAt",
        COALESCE(SUM(o.order_amount), 0)::float              AS "totalSpend",
        EXTRACT(DAY FROM NOW() - MAX(o.order_date))::int     AS "daysSinceLastOrder"
      FROM customers c
      LEFT JOIN orders o ON o.customer_id = c.id
      WHERE c.id = $1
      GROUP BY c.id
    `, [req.params.id])).rows;

    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const orders = (await client.query(`
      SELECT
        id,
        customer_id   AS "customerId",
        order_amount  AS "orderAmount",
        order_date    AS "orderDate",
        products,
        created_at    AS "createdAt"
      FROM orders
      WHERE customer_id = $1
      ORDER BY order_date DESC
    `, [req.params.id])).rows;

    const communications = (await client.query(`
      SELECT cm.id, cm.status, cm.created_at AS "createdAt", ca.name AS campaign_name
      FROM communications cm
      JOIN campaigns ca ON ca.id = cm.campaign_id
      WHERE cm.customer_id = $1
      ORDER BY cm.created_at DESC
      LIMIT 10
    `, [req.params.id])).rows
      .map((c: any) => ({ ...c, campaign: { name: c.campaign_name } }));

    res.json({ ...customer, orders, communications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch customer' });
  } finally { client.release(); }
});

// POST /api/customers/import
router.post('/import', async (_req, res) => {
  try {
    const { seedCustomers } = await import('../../seed');
    const result = await seedCustomers();
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import data' });
  }
});

export default router;
