// Capa de datos con dos modos y la misma interfaz:
//  · local → localStorage (para probar sin servidor)
//  · api   → tu API (carpeta server/) conectada a SQL Server; lo que publicas lo ve todo el mundo
import type { Row, SiteData } from './types';

const API = ((import.meta.env.VITE_API_URL as string | undefined) ?? '').trim().replace(/\/+$/, '');
export const remote = Boolean(API);
export const mode: 'local' | 'api' = remote ? 'api' : 'local';

const LS_KEY = 'linkgen.sites.v1';
const TOKEN_KEY = 'linkgen.token';
type Local = Record<string, { data: SiteData; updated_at: string }>;
const readLocal = (): Local => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as Local; } catch { return {}; }
};
const writeLocal = (o: Local) => localStorage.setItem(LS_KEY, JSON.stringify(o));

export interface User { id: string; email: string }

class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  let r: Response;
  try {
    r = await fetch(API + path, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined
    });
  } catch {
    throw new ApiError('No pude conectar con el servidor', 0);
  }
  if (!r.ok) {
    const b = (await r.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(b.error ?? `Error ${r.status}`, r.status);
  }
  return (await r.json()) as T;
}

export const Store = {
  /** Público: lo usa la página del cliente. */
  async get(slug: string): Promise<SiteData | null> {
    if (!remote) return readLocal()[slug]?.data ?? null;
    try {
      return (await api<{ data: SiteData }>(`/api/sites/${encodeURIComponent(slug)}`)).data;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return null;
      throw e;
    }
  },

  async user(): Promise<User | null> {
    if (!remote) return { id: 'local', email: 'modo prueba' };
    if (!localStorage.getItem(TOKEN_KEY)) return null;
    try {
      return (await api<{ user: User }>('/api/me')).user;
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { localStorage.removeItem(TOKEN_KEY); return null; }
      throw e;
    }
  },
  async signIn(email: string, password: string) {
    const r = await api<{ token: string }>('/api/login', { method: 'POST', body: { email, password } });
    localStorage.setItem(TOKEN_KEY, r.token);
  },
  async signOut() {
    localStorage.removeItem(TOKEN_KEY);
  },

  async list(): Promise<Row[]> {
    if (!remote) {
      return Object.entries(readLocal())
        .map(([slug, r]) => ({ slug, data: r.data, updated_at: r.updated_at }))
        .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    }
    return api<Row[]>('/api/sites');
  },
  async exists(slug: string): Promise<boolean> {
    if (!remote) return Boolean(readLocal()[slug]);
    return (await api<{ exists: boolean }>(`/api/sites/${encodeURIComponent(slug)}/exists`)).exists;
  },
  async save(slug: string, data: SiteData, oldSlug: string) {
    if (!remote) {
      const all = readLocal();
      if (oldSlug && oldSlug !== slug) delete all[oldSlug];
      all[slug] = { data, updated_at: new Date().toISOString() };
      writeLocal(all);
      return;
    }
    await api(`/api/sites/${encodeURIComponent(slug)}`, { method: 'PUT', body: { data, oldSlug } });
  },
  async remove(slug: string) {
    if (!remote) {
      const all = readLocal();
      delete all[slug];
      writeLocal(all);
      return;
    }
    await api(`/api/sites/${encodeURIComponent(slug)}`, { method: 'DELETE' });
  }
};
