# LogFlow SDK

Node.js logging SDK for Express applications.

## Install
```
npm install logflow-sdk
```

## Initialize
```ts
import { LogFlow } from 'logflow-sdk';

const logger = new LogFlow({
	apiKey: 'your-api-key',
	baseUrl: 'https://backend.example.com',
	flushIntervalMs: 10000,
	batchSize: 50,
	retries: 3
});

await logger.initialize();
```

## Express Integration
```ts
import express from 'express';
import { LogFlow } from 'logflow-sdk';

const app = express();
app.use(express.json());

const logger = new LogFlow({
	apiKey: 'your-api-key',
	baseUrl: 'https://backend.example.com'
});

await logger.initialize();
app.use(logger.middleware());

app.get('/ping', (req, res) => {
	res.json({ ok: true });
});
```

## Config Options
- apiKey (required)
- baseUrl (required)
- flushIntervalMs (optional, default 10000)
- batchSize (optional, default 50)
- retries (optional, default 3)

## Payload Format
Each request produces a lifecycle log with all fields always present:
```json
{
	"requestId": "...",
	"method": "GET",
	"path": "/ping",
	"statusCode": 200,
	"requestHeaders": {"host": "..."},
	"requestBody": null,
	"responseHeaders": {"content-type": "application/json"},
	"responseBody": {"ok": true},
	"latencyMs": 12,
	"timestamp": "2026-05-17T12:00:00.000Z",
	"errorMessage": null
}
```

## Retry Behavior
- Validation and ingestion use up to 3 attempts by default
- Exponential backoff with 10 second HTTP timeout per attempt

## Limitations
- In-memory buffer only
- No payload sanitation or masking
- No alerting or backend business rules