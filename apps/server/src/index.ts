// apps/server/src/index.ts
import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { db } from './lib/db.js';
import { redis } from './lib/redis.js';
import { errorHandler } from './middleware/errorHandler.js';

const app  = express();
const http = createServer(app);

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ logger }));

app.get('/health', async (_req, res) => {
  try {
    await db.query('SELECT 1');
    await redis.ping();
    res.json({ status: 'ok', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'error' });
  }
});

app.use(errorHandler);

http.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, '🚀 PulseDesk server started');
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM — shutting down');
  http.close(async () => {
    await db.end();
    await redis.quit();
    process.exit(0);
  });
});