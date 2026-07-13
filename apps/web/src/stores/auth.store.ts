// apps/web/src/stores/auth.store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Organization } from '@pulsedesk/shared';
import { api } from '../lib/api';

interface AuthState {
  accessToken:  string | null;
  refreshToken: string | null;
  user:         User | null;
  org:          Organization | null;
  setAuth: (data: {
    accessToken: string; refreshToken: string;
    user: User; org: Organization;
  }) => void;
  refresh: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken:  null,
      refreshToken: null,
      user:         null,
      org:          null,

      setAuth: (data) => set(data),

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) throw new Error('No refresh token');
        const res = await api.post('/auth/refresh', { refreshToken });
        set({
          accessToken:  res.data.accessToken,
          refreshToken: res.data.refreshToken,
        });
      },

      logout: () => set({
        accessToken: null, refreshToken: null, user: null, org: null,
      }),
    }),
    { name: 'pulsedesk-auth' }
  )
);