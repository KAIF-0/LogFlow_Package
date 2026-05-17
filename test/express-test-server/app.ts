import express from 'express';
import { LogFlow } from 'logflow-sdk';

const app = express();
app.use(express.json());

const logger = new LogFlow({
  apiKey: 'lf_7_T7BSN1gdHA_cPKmhL55m7Z2NGdcm3VbgQ_kry1SUemc',
  baseUrl: 'https://symmetrical-happiness-4j7xw6v5pqg5cqvjq-8080.app.github.dev',
  flushIntervalMs: 5000,
  batchSize: 20
});

await logger.initialize();
app.use(logger.middleware());

app.get('/ping', (req, res) => {
  res.json({ ok: true, time: Date.now() });
});

app.get('/error', (req, res) => {
  res.status(500).json({ ok: false, time: Date.now() });
});

app.listen(3000, () => {
  void 0;
});
