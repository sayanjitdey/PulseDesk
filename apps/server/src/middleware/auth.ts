import type { Request, Response, NextFunction } from 'express';
import { jwtVerify } from 'jose';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';

export interface JwtPayload {
  id: string;
  orgId: string;
  role: string;
  email: string;
}

// Augment express Request so every handler has typed user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      orgId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError();

    const token  = header.slice(7);
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    req.user  = payload as unknown as JwtPayload;
    req.orgId = payload.orgId as string;
    next();
  } catch {
    next(new UnauthorizedError());
  }
}
