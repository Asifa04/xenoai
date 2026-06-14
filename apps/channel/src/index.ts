import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import sendRouter from './api/send/routes';
import { startEventWorker } from './workers/eventWorker';

const app = express();
const PORT = process.env.PORT || 4001;

app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_, res) => res.json({ status: 'ok', service: 'channel' }));

app.use('/api/send', sendRouter);

app.listen(PORT, () => {
  console.log(`📡 Channel Service running on port ${PORT}`);
  startEventWorker();
});
