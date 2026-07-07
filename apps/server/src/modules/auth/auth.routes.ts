// apps/server/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { authMiddleware } from '../../middleware/auth.js';
import { ValidationError } from '../../lib/errors.js';

const router  = Router();
const service = new AuthService();

const registerSchema = z.object({
  orgName:  z.string().min(2).max(80),
  email:    z.string().email(),
  password: z.string().min(8),
  name:     z.string().min(2).max(80),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const body = registerSchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error.flatten());
    res.status(201).json(await service.register(body.data));
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.safeParse(req.body);
    if (!body.success) throw new ValidationError(body.error.flatten());
    res.json(await service.login(body.data.email, body.data.password));
  } catch (err) { next(err); }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new ValidationError('refreshToken required');
    res.json(await service.refresh(refreshToken));
  } catch (err) { next(err); }
});

// GET /api/auth/me  (protected)
router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await service.me(req.user!.id);
    res.json(user);
  } catch (err) { next(err); }
});

export { router as authRoutes };