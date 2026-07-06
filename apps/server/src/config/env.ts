// apps/server/src/config/env.ts
import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV:           z.enum(['development', 'production', 'test']).default('development'),
  PORT:               z.coerce.number().default(3000),
  DATABASE_URL:       z.string().min(1),
  REDIS_URL:          z.string().default('redis://localhost:6379'),
  JWT_SECRET:         z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  GROQ_API_KEY:       z.string().default(''),
  FRONTEND_URL:       z.string().default('http://localhost:5173'),
});

const result = schema.safeParse(process.env);

if (!result.success) {
  console.error('❌  Invalid environment variables:');
  console.error(JSON.stringify(result.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

export const env = result.data;