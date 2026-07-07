// apps/server/src/modules/auth/auth.service.ts
import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import { db, withTransaction } from '../../lib/db.js';
import { env } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../lib/errors.js';
import type { LoginResponse, RegisterRequest } from '@pulsedesk/shared';

export class AuthService {

  // ── Token helpers ──────────────────────────────────────────────────
  private async signPair(payload: Record<string, unknown>) {
    const accessSecret  = new TextEncoder().encode(env.JWT_SECRET);
    const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

    const base = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' });

    const [accessToken, refreshToken] = await Promise.all([
      base.setExpirationTime('15m').sign(accessSecret),
      base.setExpirationTime('7d').sign(refreshSecret),
    ]);

    return { accessToken, refreshToken };
  }

  // ── Register (creates org + owner) ────────────────────────────────
  async register(data: RegisterRequest): Promise<LoginResponse> {
    return withTransaction(async (client) => {

      // Unique slug from org name
      const slug = data.orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const { rows: [org] } = await client.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2) RETURNING *`,
        [data.orgName, slug]
      );

      // Check email not already used
      const exists = await client.query(
        'SELECT id FROM users WHERE email = $1', [data.email]
      );
      if (exists.rows[0]) throw new ConflictError('Email already registered');

      const hash = await bcrypt.hash(data.password, 12);

      const { rows: [user] } = await client.query(
        `INSERT INTO users (org_id, email, password_hash, name, role)
         VALUES ($1, $2, $3, $4, 'owner')
         RETURNING id, email, name, role, org_id, created_at`,
        [org.id, data.email, hash, data.name]
      );

      const tokens = await this.signPair({
        id:    user.id,
        orgId: org.id,
        role:  user.role,
        email: user.email,
      });

      return {
        ...tokens,
        user: {
          id: user.id, email: user.email, name: user.name,
          role: user.role, orgId: org.id, isActive: true,
          createdAt: user.created_at,
        },
        org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan, createdAt: org.created_at },
      };
    });
  }

  // ── Login ─────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<LoginResponse> {
    const { rows: [row] } = await db.query(
      `SELECT u.*, o.name as org_name, o.slug, o.plan
       FROM users u
       JOIN organizations o ON o.id = u.org_id
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (!row) throw new UnauthorizedError('Invalid email or password');

    const valid = await bcrypt.compare(password, row.password_hash);
    if (!valid) throw new UnauthorizedError('Invalid email or password');

    await db.query(
      'UPDATE users SET last_seen_at = NOW() WHERE id = $1', [row.id]
    );

    const tokens = await this.signPair({
      id: row.id, orgId: row.org_id, role: row.role, email: row.email,
    });

    return {
      ...tokens,
      user: {
        id: row.id, email: row.email, name: row.name, role: row.role,
        orgId: row.org_id, isActive: true, createdAt: row.created_at,
      },
      org: {
        id: row.org_id, name: row.org_name,
        slug: row.slug, plan: row.plan, createdAt: row.created_at,
      },
    };
  }

  // ── Refresh tokens ────────────────────────────────────────────────
  async refresh(refreshToken: string) {
    try {
      const secret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
      const { payload } = await jwtVerify(refreshToken, secret);
      return this.signPair({
        id: payload.id, orgId: payload.orgId,
        role: payload.role, email: payload.email,
      });
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }
  }

  // ── Me ────────────────────────────────────────────────────────────
  async me(userId: string) {
    const { rows: [user] } = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.is_active,
              u.created_at, o.id as org_id, o.name as org_name,
              o.slug, o.plan
       FROM users u JOIN organizations o ON o.id = u.org_id
       WHERE u.id = $1`,
      [userId]
    );
    return user;
  }
}