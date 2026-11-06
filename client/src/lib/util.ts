import type { CSSProperties } from 'react';
import type { Btn, Theme } from './types';
import { hasIcon } from './icons';

export const DEFAULT_THEME: Theme = {
  colorPrincipal: '#1d4ed8',
  fondo: '#f3f3f3',
  texto: '#111111',
  estiloBoton: 'solido',
  forma: 'redondeado'
};

export const digits = (s: string | undefined) => String(s ?? '').replace(/\D/g, '');
export const trim = (s: string | undefined) => String(s ?? '').trim();
export const uid = () => Math.random().toString(36).slice(2, 9);

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Solo deja pasar http(s), mailto y tel. Si falta el esquema, asume https:// */
export function safeUrl(u: string | undefined): string | null {
  let v = trim(u);
  if (!v) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) v = 'https://' + v;
  return /^(https?:|mailto:|tel:)/i.test(v) ? v : null;
}

export function hrefFor(b: Btn): string | null {
  switch (b.tipo) {
    case 'whatsapp': {
      const n = digits(b.numero);
      if (!n) return null;
      return 'https://wa.me/' + n + (b.mensaje ? '?text=' + encodeURIComponent(b.mensaje) : '');
    }
    case 'tel': {
      const n = trim(b.telefono).replace(/[^\d+]/g, '');
      return n ? 'tel:' + n : null;
    }
    case 'mapa':
      if (safeUrl(b.url)) return safeUrl(b.url);
      return b.direccion
        ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(b.direccion)
        : null;
    case 'link':
      return safeUrl(b.url);
    default:
      return null;
  }
}

export function iconFor(b: Btn): string | null {
  const ic = b.icono;
  if (ic === 'none') return null;
  if (ic && ic !== 'auto' && hasIcon(ic)) return ic;
  switch (b.tipo) {
    case 'whatsapp': return 'whatsapp';
    case 'info': return 'info';
    case 'mapa': return 'pin';
    case 'tel': return 'phone';
    default: {
      const u = (b.url ?? '').toLowerCase();
      if (/instagram\.com/.test(u)) return 'instagram';
      if (/facebook\.com|fb\.com|fb\.me/.test(u)) return 'facebook';
      if (/tiktok\.com/.test(u)) return 'tiktok';
      if (/youtube\.com|youtu\.be/.test(u)) return 'youtube';
      if (/wa\.me|whatsapp\.com/.test(u)) return 'whatsapp';
      return 'link';
    }
  }
}

// ── colores ──
function rgb(c: string): [number, number, number] | null {
  let v = trim(c).replace('#', '');
  if (v.length === 3) v = v.split('').map((x) => x + x).join('');
  if (!/^[0-9a-f]{6}$/i.test(v)) return null;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16)) as [number, number, number];
}
const col = (c: string, fallback: string) => {
  const v = rgb(c);
  return v ? '#' + v.map((x) => x.toString(16).padStart(2, '0')).join('') : fallback;
};
function lum(c: string) {
  const v = rgb(c);
  if (!v) return 0;
  const [r, g, b] = v.map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a: string, b: string) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Variables CSS del tema; se aplican en el contenedor de la página (sirve para la vista previa también). */
export function themeVars(t: Theme): CSSProperties {
  const p = col(t.colorPrincipal, DEFAULT_THEME.colorPrincipal);
  const bg = col(t.fondo, DEFAULT_THEME.fondo);
  const tx = col(t.texto, DEFAULT_THEME.texto);
  const radius = { redondeado: '16px', pill: '999px', recto: '4px' }[t.forma] ?? '16px';
  return {
    '--primary': p,
    '--bg': bg,
    '--text': tx,
    '--bio': t.colorDescripcion ? col(t.colorDescripcion, tx) : tx,
    '--on-primary': ratio(p, '#ffffff') >= ratio(p, '#111111') ? '#ffffff' : '#111111',
    '--name': ratio(p, bg) >= 3 ? p : tx,
    '--radius': radius
  } as CSSProperties;
}

// ── links ──
// Nombres que no se pueden usar como link (rutas del sistema y subdominios típicos que ya tienen otro uso)
export const RESERVED = [
  'admin', 'index', 'assets', 'api', 'login', 'static', 'favicon',
  'www', 'app', 'mail', 'smtp', 'ftp', 'webmail', 'cpanel', 'ns1', 'ns2',
  // subdominios que ya existen en woditek.com (no se pueden usar como link de un cliente)
  'agenciaviajes', 'barberia', 'burger', 'carwash', 'colegio', 'concesionario', 'dentista', 'gimnasio',
  'hotel', 'huaralshop', 'licoreria', 'marketpos', 'nfc', 'optica', 'portafolio', 'qr', 'restaurante', 'sunat',
  'veterinaria', 'zapateria'
];

const clean = import.meta.env.VITE_CLEAN_URLS === 'true';
const BASE_DOMAIN = ((import.meta.env.VITE_BASE_DOMAIN as string | undefined) ?? '').trim().toLowerCase();
const onBaseDomain =
  Boolean(BASE_DOMAIN) && (location.hostname === BASE_DOMAIN || location.hostname.endsWith('.' + BASE_DOMAIN));

/** Si se entra por negocio.tudominio.com, devuelve "negocio". Si no, cadena vacía. */
export function subdomainSlug(): string {
  if (!onBaseDomain || location.hostname === BASE_DOMAIN) return '';
  const sub = location.hostname.slice(0, -(BASE_DOMAIN.length + 1));
  return sub.includes('.') || RESERVED.includes(sub) ? '' : sub;
}

export const linkFor = (slug: string) =>
  BASE_DOMAIN ? `https://${slug}.${BASE_DOMAIN}`
    : clean ? `${location.origin}/${slug}`
      : `${location.origin}/?c=${slug}`;
