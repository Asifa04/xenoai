import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { communicationEvents } from '../../db/schema';
import { sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

const STATUS_ORDER: Record<string, number> = {
  QUEUED: 0,
  SENT: 1,
  DELIVERED: 2,
  OPENED: 3,
  READ: 4,
  CLICKED: 5,
  FAILED: 1
};

const EVENT_TO_STATUS: Record<string, string> = {
  sent: 'SENT',
  delivered: 'DELIVERED',
  opened: 'OPENED',
  read: 'READ',
  clicked: 'CLICKED',
  failed: 'FAILED'
};

const EVENT_TO_TS: Record<string, string> = {
  sent: 'sent_at',
  delivered: 'delivered_at',
  opened: 'opened_at',
  read: 'read_at',
  clicked: 'clicked_at',
  failed: 'failed_at'
};

const ANALYTICS_FIELD: Record<string, string> = {
  sent: 'total_sent',
  delivered: 'delivered',
  failed: 'failed',
  opened: 'opened',
  read: 'read',
  clicked: 'clicked'
};

/* ---------------- EVENT ---------------- */

router.post('/event', async (req: Request, res: Response) => {
  try {
    const {
      communicationId,
      event,
      timestamp
    } = req.body as {
      communicationId: string;
      event: string;
      timestamp?: string;
    };

    if (!communicationId || !event) {
      return res.status(400).json({
        error: 'communicationId and event required'
      });
    }

    const rows = (await db.execute(sql`
      SELECT * FROM communications WHERE id = ${communicationId}
    `)).rows;

    if (!rows.length) {
      return res.status(404).json({ error: 'Communication not found' });
    }

    const comm = rows[0] as any;

    const newStatus = EVENT_TO_STATUS[event];
    if (!newStatus) {
      return res.status(400).json({ error: `Unknown event: ${event}` });
    }

    const tsField = EVENT_TO_TS[event];
    const ts = new Date(timestamp || Date.now());

    const currentOrder = STATUS_ORDER[comm.status] || 0;
    const newOrder = STATUS_ORDER[newStatus] || 0;

    // safer update logic (NO string injection)
    const updates: string[] = [];

    if (tsField) {
      updates.push(`${tsField} = '${ts.toISOString()}'`);
    }

    if (newOrder >= currentOrder) {
      updates.push(`status = '${newStatus}'`);
    }

    if (updates.length) {
      await db.execute(sql`
        UPDATE communications
        SET ${sql.raw(updates.join(', '))}
        WHERE id = ${communicationId}
      `);
    }

    await db.insert(communicationEvents).values({
      id: createId(),
      communicationId,
      event,
      metadata: req.body,
      createdAt: new Date()
    });

    const analyticsField = ANALYTICS_FIELD[event];

    if (analyticsField) {
      await db.execute(sql`
        UPDATE campaign_analytics
        SET ${sql.raw(`${analyticsField} = ${analyticsField} + 1`)},
            updated_at = NOW()
        WHERE campaign_id = ${comm.campaign_id}
      `);
    }

    // Check campaign completion
    if (event === 'delivered' || event === 'failed') {
      const [a] = (await db.execute(sql`
        SELECT * FROM campaign_analytics
        WHERE campaign_id = ${comm.campaign_id}
      `)).rows as any[];

      if (
        a &&
        a.total_sent > 0 &&
        (a.delivered + a.failed) >= a.total_sent
      ) {
        await db.execute(sql`
          UPDATE campaigns
          SET status = 'COMPLETED',
              completed_at = NOW()
          WHERE id = ${comm.campaign_id}
          AND status = 'RUNNING'
        `);
      }
    }

    res.json({ success: true });

  } catch (err) {
    console.error('Receipt error:', err);
    res.status(500).json({ error: 'Failed to process receipt' });
  }
});

export default router;