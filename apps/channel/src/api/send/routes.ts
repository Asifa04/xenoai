import { Router } from 'express';
import { scheduleLifecycle, SendRequest } from '../../simulator/lifecycle';

const router = Router();

// POST /api/send/single
router.post('/single', async (req, res) => {
  try {
    const { communicationId, channel, recipient, message, callbackUrl } = req.body as SendRequest;

    if (!communicationId || !channel || !callbackUrl) {
      return res.status(400).json({ error: 'communicationId, channel, and callbackUrl are required' });
    }

    await scheduleLifecycle({ communicationId, channel, recipient, message, callbackUrl });
    res.json({ success: true, communicationId, message: 'Lifecycle events scheduled' });
  } catch (err) {
    console.error('Send error:', err);
    res.status(500).json({ error: 'Failed to schedule send' });
  }
});

// POST /api/send/batch
router.post('/batch', async (req, res) => {
  try {
    const { callbackUrl, communications } = req.body as {
      callbackUrl: string;
      communications: Array<{
        communicationId: string;
        channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
        recipient: string;
        message: string;
      }>;
    };

    if (!callbackUrl || !communications?.length) {
      return res.status(400).json({ error: 'callbackUrl and communications are required' });
    }

    console.log(`📨 Received batch of ${communications.length} communications`);

    // Schedule all in parallel (with small batching to avoid overwhelming queue)
    const BATCH_SIZE = 50;
    for (let i = 0; i < communications.length; i += BATCH_SIZE) {
      const batch = communications.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((comm) =>
          scheduleLifecycle({ ...comm, callbackUrl })
        )
      );
      if (i + BATCH_SIZE < communications.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      scheduled: communications.length,
      message: `${communications.length} communications scheduled for simulated delivery`,
    });
  } catch (err) {
    console.error('Batch send error:', err);
    res.status(500).json({ error: 'Failed to process batch' });
  }
});

export default router;
