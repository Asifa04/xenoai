import { Router, Request, Response } from 'express';
import { db } from '../../db';
import { segments } from '../../db/schema';
import { sql } from 'drizzle-orm';
import {
  getModel,
  generateSegmentRules,
  generateCampaign,
  analyzeCampaign,
  COPILOT_SYSTEM_PROMPT
} from '../../lib/ai';
import { evaluateSegment } from '../../lib/segment-eval';
import { createId } from '@paralleldrive/cuid2';

const router = Router();

async function toolCreateSegment(prompt: string) {
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

  return { segment, size: ids.length };
}

async function toolGetTopCustomers(limit: number) {
  const rows = await db.execute(sql`
    SELECT c.id, c.name, c.email,
           COUNT(o.id)::int AS order_count,
           COALESCE(SUM(o.order_amount),0)::float AS total_spend
    FROM customers c
    LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id
    ORDER BY total_spend DESC
    LIMIT ${limit || 10}
  `);

  return rows.rows;
}

async function toolGetStats() {
  const [c] = (await db.execute(sql`
    SELECT COUNT(*)::int AS customers FROM customers
  `)).rows as any[];

  const [o] = (await db.execute(sql`
    SELECT COUNT(*)::int AS orders,
           COALESCE(SUM(order_amount),0)::float AS revenue
    FROM orders
  `)).rows as any[];

  const cStats = (await db.execute(sql`
    SELECT status, COUNT(*)::int AS count
    FROM campaigns
    GROUP BY status
  `)).rows as any[];

  return {
    customers: c.customers,
    orders: o.orders,
    revenue: o.revenue,
    campaigns: cStats.reduce(
      (a: any, r: any) => ({ ...a, [r.status]: r.count }),
      {}
    )
  };
}

/* ---------------- CHAT ---------------- */

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages } = req.body as {
      messages: { role: string; content: string }[];
    };

    const model = getModel();
    const stats = await toolGetStats();

    const systemWithCtx = `${COPILOT_SYSTEM_PROMPT}

Live CRM Stats: ${stats.customers} customers, ${stats.orders} orders, ₹${Math.round(
      stats.revenue
    ).toLocaleString()} revenue, campaigns: ${JSON.stringify(stats.campaigns)}`;

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const lastMsg = messages[messages.length - 1]?.content || '';
    const lower = lastMsg.toLowerCase();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let toolResult: any = null;
    let toolName = '';

    try {
      if (
        (lower.includes('creat') ||
          lower.includes('find') ||
          lower.includes('build') ||
          lower.includes('segment')) &&
        (lower.includes('customer') ||
          lower.includes('audience') ||
          lower.includes('buyer') ||
          lower.includes('inactive') ||
          lower.includes('spent') ||
          lower.includes('purchase'))
      ) {
        toolName = 'create_segment';
        toolResult = await toolCreateSegment(lastMsg);
      } else if (
        lower.includes('top') &&
        (lower.includes('customer') ||
          lower.includes('spender') ||
          lower.includes('buyer'))
      ) {
        toolName = 'get_top_customers';
        toolResult = { customers: await toolGetTopCustomers(10) };
      } else if (
        lower.includes('stat') ||
        lower.includes('dashboard') ||
        lower.includes('overview') ||
        lower.includes('how many') ||
        lower.includes('revenue') ||
        lower.includes('performance')
      ) {
        toolName = 'get_stats';
        toolResult = await toolGetStats();
      }
    } catch (toolErr) {
      console.error('Tool error:', toolErr);
    }

    if (toolResult) {
      res.write(
        `data: ${JSON.stringify({
          type: 'tool',
          tool: toolName,
          result: toolResult
        })}\n\n`
      );
    }

    const chat = model.startChat({
      system: systemWithCtx,
      history
    });

    const enriched = toolResult
      ? `${lastMsg}\n\n[Tool: ${toolName} executed]\n[Result: ${JSON.stringify(
          toolResult
        )}]\nRespond naturally about what was done and suggest next steps.`
      : lastMsg;

    const stream = await chat.sendMessageStream(enriched);

    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (text) {
        res.write(
          `data: ${JSON.stringify({ type: 'text', text })}\n\n`
        );
      }
    }

    res.write(
      `data: ${JSON.stringify({ type: 'done' })}\n\n`
    );

    res.end();
  } catch (err) {
    console.error('Copilot error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI service error' });
    }
  }
});

/* ---------------- SEGMENT ---------------- */

router.post('/segment', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body as { prompt: string };
    res.json(await generateSegmentRules(prompt));
  } catch {
    res.status(500).json({ error: 'Failed to generate segment rules' });
  }
});

/* ---------------- CAMPAIGN ---------------- */

router.post('/campaign', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      goal: string;
      segmentDescription?: string;
    };

    res.json(
      await generateCampaign(
        body.goal,
        body.segmentDescription || 'general audience'
      )
    );
  } catch {
    res.status(500).json({ error: 'Failed to generate campaign' });
  }
});

/* ---------------- ANALYZE ---------------- */

router.post('/analyze/:campaignId', async (req: Request, res: Response) => {
  try {
    const rows = (await db.execute(sql`
      SELECT c.name, a.*
      FROM campaigns c
      JOIN campaign_analytics a ON a.campaign_id = c.id
      WHERE c.id = ${req.params.campaignId}
    `)).rows as any[];

    if (!rows.length) {
      return res.status(404).json({ error: 'Not found' });
    }

    const d = rows[0];

    const analysis = await analyzeCampaign({
      name: d.name,
      totalSent: d.total_sent,
      delivered: d.delivered,
      failed: d.failed,
      opened: d.opened,
      read: d.read,
      clicked: d.clicked,
      conversions: d.conversions
    });

    res.json({ analysis });
  } catch {
    res.status(500).json({ error: 'Failed to analyze' });
  }
});

export default router;