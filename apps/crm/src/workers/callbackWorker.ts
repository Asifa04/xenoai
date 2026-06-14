import { Worker } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export function startCallbackWorker() {
  const worker = new Worker('campaign-send', async (job) => {
    const { campaignId, channelServiceUrl, callbackUrl, communications } = job.data;
    console.log(`📤 Dispatching campaign ${campaignId} (${communications.length} recipients)`);
    const response = await fetch(`${channelServiceUrl}/api/send/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callbackUrl, communications }),
    });
    if (!response.ok) throw new Error(`Channel service returned ${response.status}`);
    console.log(`✅ Campaign ${campaignId} dispatched`);
  }, { connection: { url: REDIS_URL }, concurrency: 5 });

  worker.on('failed', (job, err) => console.error(`Worker failed job ${job?.id}:`, err.message));
  console.log('🔧 BullMQ send worker started');
  return worker;
}
