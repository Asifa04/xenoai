import { eventQueue } from '../lib/queue';

const PROBABILITIES: Record<string, Record<string, number>> = {
  EMAIL:    { delivered: 0.90, opened: 0.32, read: 0.24, clicked: 0.08 },
  SMS:      { delivered: 0.96, opened: 0.72, read: 0.65, clicked: 0.15 },
  WHATSAPP: { delivered: 0.98, opened: 0.80, read: 0.72, clicked: 0.20 },
};

const DELAYS = {
  sent:      { min: 200,   max: 1000 },
  delivered: { min: 1000,  max: 5000 },
  opened:    { min: 5000,  max: 30000 },
  read:      { min: 10000, max: 60000 },
  clicked:   { min: 15000, max: 90000 },
  failed:    { min: 1000,  max: 3000 },
};

function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

export interface SendRequest {
  communicationId: string;
  channel: string;
  recipient: string;
  message: string;
  callbackUrl: string;
}

export async function scheduleLifecycle(req: SendRequest): Promise<void> {
  const p = PROBABILITIES[req.channel] || PROBABILITIES.EMAIL;
  const events: { event: string; delayMs: number }[] = [];

  events.push({ event: 'sent', delayMs: rand(DELAYS.sent.min, DELAYS.sent.max) });

  if (Math.random() < p.delivered) {
    events.push({ event: 'delivered', delayMs: rand(DELAYS.delivered.min, DELAYS.delivered.max) });
    if (Math.random() < p.opened) {
      events.push({ event: 'opened', delayMs: rand(DELAYS.opened.min, DELAYS.opened.max) });
      if (Math.random() < p.read) {
        events.push({ event: 'read', delayMs: rand(DELAYS.read.min, DELAYS.read.max) });
        if (Math.random() < p.clicked) {
          events.push({ event: 'clicked', delayMs: rand(DELAYS.clicked.min, DELAYS.clicked.max) });
        }
      }
    }
  } else {
    events.push({ event: 'failed', delayMs: rand(DELAYS.failed.min, DELAYS.failed.max) });
  }

  for (const { event, delayMs } of events) {
    await eventQueue.add('fire-callback', {
      communicationId: req.communicationId, event, callbackUrl: req.callbackUrl,
      timestamp: new Date(Date.now() + delayMs).toISOString(),
    }, { delay: delayMs });
  }
}
