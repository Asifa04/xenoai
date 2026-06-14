import { Router } from 'express';
import { db } from '../../db';
import { segments, customers } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { evaluateSegment } from '../../lib/segment-eval';
import { generateSegmentRules } from '../../lib/ai';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(segments).orderBy(desc(segments.createdAt));
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch segments' }); }
});

router.post('/preview', async (req, res) => {
  try {
    const { rules } = req.body;
    const ids = await evaluateSegment(rules);
    const sample = ids.length ? await db.execute(sql`
      SELECT id, name, email, city FROM customers WHERE id IN (${sql.raw(ids.slice(0,5).map(id => `'${id}'`).join(','))})
    `) : { rows: [] };
    res.json({ count: ids.length, sample: sample.rows });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to preview segment' }); }
});

router.post('/ai', async (req, res) => {
  try {
    const { prompt } = req.body;
    const generated = await generateSegmentRules(prompt);
    const ids = await evaluateSegment(generated.rules);
    const now = new Date();
    const [segment] = await db.insert(segments).values({
      id: createId(), name: generated.name, description: generated.description,
      rules: generated.rules, aiPrompt: prompt, size: ids.length,
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json({ segment, customerIds: ids });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate AI segment' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, rules, aiPrompt } = req.body;
    const ids = await evaluateSegment(rules);
    const now = new Date();
    const [segment] = await db.insert(segments).values({
      id: createId(), name, description, rules, aiPrompt, size: ids.length,
      createdAt: now, updatedAt: now,
    }).returning();
    res.status(201).json(segment);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create segment' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const [segment] = await db.select().from(segments).where(eq(segments.id, req.params.id));
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    res.json(segment);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch segment' }); }
});

router.get('/:id/customers', async (req, res) => {
  try {
    const [segment] = await db.select().from(segments).where(eq(segments.id, req.params.id));
    if (!segment) return res.status(404).json({ error: 'Segment not found' });
    const { page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const ids = await evaluateSegment(segment.rules as any);
    if (!ids.length) return res.json({ customers: [], total: 0 });
    const idsSQL = ids.map(id => `'${id}'`).join(',');
    const rows = await db.execute(sql.raw(`
      SELECT id, name, email, city, gender FROM customers WHERE id IN (${idsSQL})
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `));
    res.json({ customers: rows.rows, total: ids.length });
  } catch (err) { res.status(500).json({ error: 'Failed to fetch segment customers' }); }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.delete(segments).where(eq(segments.id, req.params.id));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed to delete segment' }); }
});

export default router;
