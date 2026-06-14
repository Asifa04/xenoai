import { Router } from 'express';
import { db } from '../../db';
import { campaigns, segments, communications, campaignAnalytics, customers } from '../../db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import { evaluateSegment } from '../../lib/segment-eval';
import { generateCampaign, analyzeCampaign } from '../../lib/ai';
import { sendQueue } from '../../lib/queue';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.*, s.name AS segment_name, s.size AS segment_size,
             a.total_sent, a.delivered, a.failed, a.opened, a.read, a.clicked, a.conversions,
             (SELECT COUNT(*)::int FROM communications cm WHERE cm.campaign_id = c.id) AS comm_count
      FROM campaigns c
      LEFT JOIN segments s ON s.id = c.segment_id
      LEFT JOIN campaign_analytics a ON a.campaign_id = c.id
      ORDER BY c.created_at DESC
    `);
    const result = rows.rows.map((r: any) => ({
      ...r,
      segment: { name: r.segment_name, size: r.segment_size },
      analytics: r.total_sent != null ? { totalSent: r.total_sent, delivered: r.delivered, failed: r.failed, opened: r.opened, read: r.read, clicked: r.clicked, conversions: r.conversions } : null,
    }));
    res.json(result);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch campaigns' }); }
});

router.get('/:id', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.*, s.name AS segment_name, s.size AS segment_size, s.rules AS segment_rules,
             a.total_sent, a.delivered, a.failed, a.opened, a.read, a.clicked, a.conversions
      FROM campaigns c
      LEFT JOIN segments s ON s.id = c.segment_id
      LEFT JOIN campaign_analytics a ON a.campaign_id = c.id
      WHERE c.id = ${req.params.id}
    `);
    if (!rows.rows.length) return res.status(404).json({ error: 'Campaign not found' });
    const comms = await db.execute(sql`
      SELECT cm.*, cu.name AS customer_name, cu.email AS customer_email
      FROM communications cm JOIN customers cu ON cu.id = cm.customer_id
      WHERE cm.campaign_id = ${req.params.id}
      ORDER BY cm.created_at DESC LIMIT 20
    `);
    const r = rows.rows[0] as any;
    res.json({
      ...r,
      segment: { name: r.segment_name, size: r.segment_size, rules: r.segment_rules },
      analytics: r.total_sent != null ? { totalSent: r.total_sent, delivered: r.delivered, failed: r.failed, opened: r.opened, read: r.read, clicked: r.clicked, conversions: r.conversions } : null,
      communications: comms.rows.map((c: any) => ({ ...c, customer: { name: c.customer_name, email: c.customer_email } })),
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch campaign' }); }
});

router.post('/', async (req, res) => {
  try {
    const { name, segmentId, channel, message } = req.body;
    const now = new Date();
    const [campaign] = await db.insert(campaigns).values({
      id: createId(), name, segmentId, channel, message, status: 'DRAFT',
      createdAt: now,
    }).returning();
    res.status(201).json(campaign);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create campaign' }); }
});

router.post('/ai', async (req, res) => {
  try {
    const { goal, segmentId } = req.body;
    let segmentDesc = 'general audience';
    if (segmentId) {
      const [seg] = await db.select().from(segments).where(eq(segments.id, segmentId));
      if (seg?.description) segmentDesc = seg.description;
    }
    const draft = await generateCampaign(goal, segmentDesc);
    res.json(draft);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to generate campaign' }); }
});

router.post('/:id/launch', async (req, res) => {
  try {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, req.params.id));
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status !== 'DRAFT') return res.status(400).json({ error: 'Only DRAFT campaigns can be launched' });

    const [segment] = await db.select().from(segments).where(eq(segments.id, campaign.segmentId));
    if (!segment) return res.status(400).json({ error: 'Segment not found' });

    const customerIds = await evaluateSegment(segment.rules as any);
    if (!customerIds.length) return res.status(400).json({ error: 'No customers match this segment' });

    const idsSQL = customerIds.map(id => `'${id}'`).join(',');
    const custRows = await db.execute(sql.raw(`SELECT id, name, email, phone FROM customers WHERE id IN (${idsSQL})`));
    const custList = custRows.rows as { id: string; name: string; email: string; phone: string }[];

    // Create communication records in bulk
    const now = new Date();
    const commValues = custList.map(c => ({
      id: createId(),
      campaignId: campaign.id,
      customerId: c.id,
      channel: campaign.channel,
      message: campaign.message.replace('{{name}}', c.name.split(' ')[0]),
      status: 'QUEUED' as const,
      createdAt: now,
    }));

    const inserted = await db.insert(communications).values(commValues).returning();

    // Create analytics row
    await db.insert(campaignAnalytics).values({
      id: createId(), campaignId: campaign.id, totalSent: custList.length, updatedAt: now,
    }).onConflictDoUpdate({ target: campaignAnalytics.campaignId, set: { totalSent: custList.length, updatedAt: now } });

    // Mark running
    await db.update(campaigns).set({ status: 'RUNNING', sentAt: now }).where(eq(campaigns.id, campaign.id));

    const CHANNEL_URL = process.env.CHANNEL_SERVICE_URL || 'http://localhost:4001';
    const CALLBACK_URL = process.env.CRM_CALLBACK_URL || 'http://localhost:4000/api/receipt/event';

    await sendQueue.add('dispatch-campaign', {
      campaignId: campaign.id,
      channelServiceUrl: CHANNEL_URL,
      callbackUrl: CALLBACK_URL,
      communications: inserted.map((c, i) => ({
        communicationId: c.id,
        channel: campaign.channel,
        recipient: custList[i]?.email || custList[i]?.phone || '',
        message: c.message,
      })),
    });

    res.json({ success: true, recipientCount: custList.length });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to launch campaign' }); }
});

router.post('/:id/analyze', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT c.name, a.* FROM campaigns c
      JOIN campaign_analytics a ON a.campaign_id = c.id
      WHERE c.id = ${req.params.id}
    `);
    if (!rows.rows.length) return res.status(404).json({ error: 'Campaign analytics not found' });
    const data = rows.rows[0] as any;
    const analysis = await analyzeCampaign({
      name: data.name, totalSent: data.total_sent, delivered: data.delivered,
      failed: data.failed, opened: data.opened, read: data.read,
      clicked: data.clicked, conversions: data.conversions,
    });
    res.json({ analysis });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to analyze campaign' }); }
});

export default router;
