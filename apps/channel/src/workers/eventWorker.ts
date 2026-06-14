import { Worker } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export function startEventWorker() {
  const worker = new Worker('channel-events', async (job) => {
    const { communicationId, event, callbackUrl, timestamp } = job.data;
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Channel-Service': 'xenoai-channel' },
      body: JSON.stringify({ communicationId, event, timestamp }),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`CRM callback returned ${response.status}: ${body}`);
    }
    console.log(`📬 [${event.toUpperCase()}] comm:${communicationId.slice(0,8)}...`);
  }, { connection: { url: REDIS_URL }, concurrency: 20 });

  worker.on('failed', (job, err) => console.error(`Event worker failed job ${job?.id}:`, err.message));
  console.log('🔧 Channel event worker started (concurrency: 20)');
  return worker;
}
