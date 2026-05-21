import express from 'express';
import { LogFlow } from 'logflow-sdk';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const logger = new LogFlow({
  apiKey: process.env.LOGFLOW_API_KEY!,
  baseUrl: process.env.LOGFLOW_BASE_URL!,
  flushIntervalMs: 5000,
  batchSize: 20,
  retries: 1
});

await logger.initialize();
app.use(logger.middleware());

app.get('/ping', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.get('/error', (req, res) => {
  res.status(500).json({ ok: false, time: Date.now() });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, msg: 'Not Found', time: Date.now() });
});

app.listen(3000, () => {
  void 0;
});
