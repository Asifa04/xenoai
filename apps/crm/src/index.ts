import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { migrate } from './db/migrate';
import { seedCustomers } from './seed';

import customersRouter from './api/customers/routes';
import ordersRouter from './api/orders/routes';
import segmentsRouter from './api/segments/routes';
import campaignsRouter from './api/campaigns/routes';
import analyticsRouter from './api/analytics/routes';
import receiptRouter from './api/receipt/routes';
import aiRouter from './api/ai/routes';
import { startCallbackWorker } from './workers/callbackWorker';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'crm' }));

app.use('/api/customers', customersRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/receipt', receiptRouter);
app.use('/api/ai', aiRouter);

async function start() {
  try {
    await migrate();
    await seedCustomers();

    app.listen(PORT, () => {
      console.log(`🚀 CRM Service running on port ${PORT}`);
      startCallbackWorker();
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
