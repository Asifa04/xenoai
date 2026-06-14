import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { segments } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { evaluateSegment } from '../../lib/segment-eval';
import { generateSegmentRules } from '../../lib/ai';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

/* ---------------- GET ALL SEGMENTS ---------------- */

router.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(segments)
      .orderBy(desc(segments.createdAt));

    res.json(rows);
  } catch {
    res.status(500).json({ error: 'Failed to fetch segments' });
  }
});

/* ---------------- PREVIEW SEGMENT ---------------- */

router.post('/preview', async (req: Request, res: Response) => {
  try {
    const { rules } = req.body as { rules: any };

    const ids = await evaluateSegment(rules);

    let sample: any = { rows: [] };

    if (ids.length) {
      const safeIds = ids.slice(0, 5);

      const result = await db.execute(sql`
        SELECT id, name, email, city
        FROM customers
        WHERE id = ANY(${safeIds})
      `);

      sample = result;
    }

    res.json({
      count: ids.length,
      sample: sample.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to preview segment' });
  }
});

/* ---------------- AI SEGMENT ---------------- */

router.post('/ai', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt: string };

    const generated = await generateSegmentRules(prompt);
    const ids = await evaluateSegment(generated.rules);

    const now = new Date();

    const [segment] = await db.insert(segments).values({
      id: createId(),
      name: generated.name,
      description: generated.description,
      rules: generated.rules,
      aiPrompt: prompt,
      size: ids.length,
      createdAt: now,
      updatedAt: now,
    }).returning();

    res.status(201).json({ segment, customerIds: ids });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to generate AI segment' });
  }
});

/* ---------------- CREATE SEGMENT ---------------- */

router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      rules,
      aiPrompt
    } = req.body as {
      name: string;
      description?: string;
      rules: any;
      aiPrompt?: string;
    };

    const ids = await evaluateSegment(rules);

    const now = new Date();

    const [segment] = await db.insert(segments).values({
      id: createId(),
      name,
      description,
      rules,
      aiPrompt,
      size: ids.length,
      createdAt: now,
      updatedAt: now,
    }).returning();

    res.status(201).json(segment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create segment' });
  }
});

/* ---------------- GET SEGMENT ---------------- */

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const [segment] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, req.params.id));

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    res.json(segment);
  } catch {
    res.status(500).json({ error: 'Failed to fetch segment' });
  }
});

/* ---------------- SEGMENT CUSTOMERS ---------------- */

router.get('/:id/customers', async (req: Request, res: Response) => {
  try {
    const [segment] = await db
      .select()
      .from(segments)
      .where(eq(segments.id, req.params.id));

    if (!segment) {
      return res.status(404).json({ error: 'Segment not found' });
    }

    const {
      page = '1',
      limit = '20'
    } = req.query as {
      page?: string;
      limit?: string;
    };

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const ids = await evaluateSegment(segment.rules as any);

    if (!ids.length) {
      return res.json({ customers: [], total: 0 });
    }

    const safeIds = ids.map(String);

    const rows = await db.execute(sql`
      SELECT id, name, email, city, gender
      FROM customers
      WHERE id = ANY(${safeIds})
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `);

    res.json({
      customers: rows.rows,
      total: ids.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch segment customers' });
  }
});

/* ---------------- DELETE SEGMENT ---------------- */

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await db
      .delete(segments)
      .where(eq(segments.id, req.params.id));

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete segment' });
  }
});

export default router;