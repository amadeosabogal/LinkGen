import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import jwt from 'jsonwebtoken';
import { getPool, sql } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('Falta JWT_SECRET (mínimo 32 caracteres) en server/.env');
  process.exit(1);
}
const PORT = Number(process.env.PORT || 3001);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

interface AuthedRequest extends Request {
  user?: { id: number; email: string };
}

const app = express();
app.set('trust proxy', 1);
// La autenticación va en el encabezado Authorization (no en cookies), por eso se puede permitir cualquier origen.
app.use(cors());
app.use(express.json({ limit: '3mb' }));

// ── límite de intentos de login (en memoria) ──
const attempts = new Map<string, { n: number; reset: number }>();
function loginLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? 'x';
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.reset < now) attempts.set(key, { n: 1, reset: now + 15 * 60_000 });
  else if (++a.n > 10) {
    res.status(429).json({ error: 'Demasiados intentos. Espera unos minutos.' });
    return;
  }
  next();
}

function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    const p = jwt.verify(token, JWT_SECRET!) as { id: number; email: string };
    req.user = { id: p.id, email: p.email };
    next();
  } catch {
    res.status(401).json({ error: 'Sesión no válida' });
  }
}

const wrap = (fn: (req: AuthedRequest, res: Response) => Promise<void>) =>
  (req: AuthedRequest, res: Response, next: NextFunction) => { fn(req, res).catch(next); };

// ── públicas ──
app.get('/api/health', (_req, res) => { res.json({ ok: true }); });

app.get('/api/sites/:slug', wrap(async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  if (!SLUG_RE.test(slug)) { res.status(404).json({ error: 'No existe' }); return; }
  const pool = await getPool();
  const r = await pool.request().input('slug', sql.NVarChar(40), slug)
    .query('SELECT Datos FROM dbo.Sitios WHERE Enlace = @slug');
  if (!r.recordset.length) { res.status(404).json({ error: 'No existe' }); return; }
  res.set('Cache-Control', 'public, max-age=15');
  res.json({ data: JSON.parse(r.recordset[0].Datos) });
}));

app.post('/api/login', loginLimiter, wrap(async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const pool = await getPool();
  const r = await pool.request().input('email', sql.NVarChar(255), email)
    .query('SELECT Id, Correo, ClaveHash FROM dbo.Usuarios WHERE Correo = @email');
  const u = r.recordset[0] as { Id: number; Correo: string; ClaveHash: string } | undefined;
  // se compara siempre con un hash para no revelar si el correo existe
  const ok = await bcrypt.compare(password, u?.ClaveHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi');
  if (!u || !ok) { res.status(401).json({ error: 'Correo o contraseña incorrectos' }); return; }
  const token = jwt.sign({ id: u.Id, email: u.Correo }, JWT_SECRET!, { expiresIn: '14d' });
  attempts.delete(req.ip ?? 'x');
  res.json({ token, user: { id: String(u.Id), email: u.Correo } });
}));

// ── privadas (panel) ──
app.get('/api/me', auth, (req: AuthedRequest, res) => {
  res.json({ user: { id: String(req.user!.id), email: req.user!.email } });
});

app.get('/api/sites', auth, wrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().input('owner', sql.Int, req.user!.id)
    .query('SELECT Enlace, Datos, ActualizadoEn FROM dbo.Sitios WHERE UsuarioId = @owner ORDER BY ActualizadoEn DESC');
  res.json(r.recordset.map((x: { Enlace: string; Datos: string; ActualizadoEn: Date }) => ({
    slug: x.Enlace, data: JSON.parse(x.Datos), updated_at: x.ActualizadoEn.toISOString()
  })));
}));

app.get('/api/sites/:slug/exists', auth, wrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().input('slug', sql.NVarChar(40), req.params.slug.toLowerCase())
    .query('SELECT 1 AS x FROM dbo.Sitios WHERE Enlace = @slug');
  res.json({ exists: r.recordset.length > 0 });
}));

app.put('/api/sites/:slug', auth, wrap(async (req, res) => {
  const slug = req.params.slug.toLowerCase();
  const oldSlug = String(req.body?.oldSlug ?? '').toLowerCase();
  const data = req.body?.data as unknown;
  if (!SLUG_RE.test(slug) || slug.length < 2 || slug.length > 40) {
    res.status(400).json({ error: 'Nombre de link no válido' }); return;
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) ||
    !Array.isArray((data as { botones?: unknown }).botones) ||
    (data as { botones: unknown[] }).botones.length > 40) {
    res.status(400).json({ error: 'Datos no válidos' }); return;
  }
  const json = JSON.stringify(data);
  if (json.length > 2_500_000) { res.status(413).json({ error: 'Los datos son demasiado grandes (revisa el logo)' }); return; }

  const pool = await getPool();
  const tx = new sql.Transaction(pool);
  await tx.begin();
  try {
    const rq = () => new sql.Request(tx);
    const upd = await rq()
      .input('slug', sql.NVarChar(40), slug).input('data', sql.NVarChar(sql.MAX), json).input('owner', sql.Int, req.user!.id)
      .query('UPDATE dbo.Sitios SET Datos = @data, ActualizadoEn = SYSUTCDATETIME() WHERE Enlace = @slug AND UsuarioId = @owner');
    if (!upd.rowsAffected[0]) {
      await rq()
        .input('slug', sql.NVarChar(40), slug).input('data', sql.NVarChar(sql.MAX), json).input('owner', sql.Int, req.user!.id)
        .query('INSERT INTO dbo.Sitios (Enlace, Datos, UsuarioId) VALUES (@slug, @data, @owner)');
    }
    if (oldSlug && oldSlug !== slug && SLUG_RE.test(oldSlug)) {
      await rq().input('old', sql.NVarChar(40), oldSlug).input('owner', sql.Int, req.user!.id)
        .query('DELETE FROM dbo.Sitios WHERE Enlace = @old AND UsuarioId = @owner');
    }
    await tx.commit();
    res.json({ ok: true });
  } catch (e) {
    await tx.rollback().catch(() => {});
    const num = (e as { number?: number }).number;
    if (num === 2627 || num === 2601) { res.status(409).json({ error: 'Ese nombre de link ya está en uso' }); return; }
    throw e;
  }
}));

app.delete('/api/sites/:slug', auth, wrap(async (req, res) => {
  const pool = await getPool();
  await pool.request().input('slug', sql.NVarChar(40), req.params.slug.toLowerCase()).input('owner', sql.Int, req.user!.id)
    .query('DELETE FROM dbo.Sitios WHERE Enlace = @slug AND UsuarioId = @owner');
  res.json({ ok: true });
}));

// ── errores ──
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Error del servidor' });
});

app.listen(PORT, () => console.log(`LinkGen API escuchando en el puerto ${PORT}`));
