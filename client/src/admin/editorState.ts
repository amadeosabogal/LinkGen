import { PRESETS } from '../lib/presets';
import type { Btn, BtnType, Draft, EditorData, FullBtn, SiteData, SocialKey } from '../lib/types';
import { DEFAULT_THEME, digits, RESERVED, safeUrl, trim, uid } from '../lib/util';

export const SOCIALS: [SocialKey, string, string][] = [
  ['instagram', 'Instagram', '@usuario o link'],
  ['facebook', 'Facebook', 'Link de la página'],
  ['tiktok', 'TikTok', '@usuario o link'],
  ['youtube', 'YouTube', 'Link del canal'],
  ['web', 'Sitio web', 'https://…'],
  ['maps', 'Google Maps', 'Link de Google Maps']
];

export const errMsg = (e: unknown) =>
  e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e);

export const hydrateBtn = (b: Btn): FullBtn => ({
  id: b.id ?? uid(),
  tipo: b.tipo,
  texto: b.texto ?? '',
  subtexto: b.subtexto ?? '',
  icono: b.icono ?? 'auto',
  url: b.url ?? '',
  numero: b.numero ?? '',
  mensaje: b.mensaje ?? '',
  contenido: b.contenido ?? '',
  direccion: b.direccion ?? '',
  telefono: b.telefono ?? ''
});
export const emptyBtn = (tipo: BtnType = 'link') => hydrateBtn({ tipo, texto: '' });

export function hydrate(raw: SiteData): EditorData {
  return {
    v: 1,
    rubro: raw.rubro || 'blanco',
    marca: { nombre: raw.marca?.nombre ?? '', bio: raw.marca?.bio ?? '', logo: raw.marca?.logo ?? '' },
    tema: { ...DEFAULT_THEME, ...raw.tema },
    redes: { instagram: '', facebook: '', tiktok: '', youtube: '', web: '', maps: '', ...raw.redes },
    botones: (raw.botones ?? []).map(hydrateBtn),
    ...(raw.orden?.length ? { orden: raw.orden } : {})
  };
}

export function draftFromPreset(key: string): Draft {
  const p = PRESETS[key];
  const data = hydrate({
    rubro: key,
    marca: { ...p.data.marca },
    tema: { ...p.data.tema },
    redes: {},
    botones: p.data.botones
  });
  return { slug: '', originalSlug: '', slugTouched: false, data };
}

export function draftFromRow(slug: string, data: SiteData): Draft {
  return { slug, originalSlug: slug, slugTouched: true, data: hydrate(data) };
}

function normSocial(k: SocialKey, v: string): string {
  const s = trim(v);
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, '');
  const base = ({ instagram: 'https://instagram.com/', tiktok: 'https://tiktok.com/@' } as Partial<Record<SocialKey, string>>)[k];
  if (base && /^[\w.]+$/.test(handle)) return base + handle;
  return s.includes('.') ? (safeUrl(s) ?? '') : '';
}

/** Lo que realmente se guarda y se publica (sin ids ni campos de otros tipos de botón). */
export function cleanData(d: EditorData): SiteData {
  const redes: SiteData['redes'] = {};
  SOCIALS.forEach(([k]) => {
    const u = normSocial(k, d.redes[k]);
    if (u) redes[k] = u;
  });
  const botones = d.botones.map((b): Btn => {
    const o: Btn = { id: b.id, tipo: b.tipo, texto: trim(b.texto) };
    if (trim(b.subtexto)) o.subtexto = trim(b.subtexto);
    if (b.icono && b.icono !== 'auto') o.icono = b.icono;
    if (b.tipo === 'whatsapp') {
      o.numero = digits(b.numero);
      if (trim(b.mensaje)) o.mensaje = trim(b.mensaje);
    } else if (b.tipo === 'link') {
      o.url = trim(b.url);
    } else if (b.tipo === 'info') {
      o.contenido = trim(b.contenido);
    } else if (b.tipo === 'mapa') {
      o.direccion = trim(b.direccion);
      if (trim(b.url)) o.url = trim(b.url);
    } else if (b.tipo === 'tel') {
      o.telefono = trim(b.telefono).replace(/[^\d+]/g, '');
    }
    return o;
  });
  return {
    v: 1,
    rubro: d.rubro,
    marca: { nombre: trim(d.marca.nombre), bio: trim(d.marca.bio), logo: d.marca.logo },
    tema: { ...d.tema },
    redes,
    botones,
    ...(d.orden?.length ? { orden: d.orden } : {})
  };
}

export function validate(draft: Draft): string[] {
  const e: string[] = [];
  const d = draft.data;
  if (!trim(d.marca.nombre)) e.push('Escribe el nombre del negocio.');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(draft.slug) || draft.slug.length < 2)
    e.push('El link solo puede tener letras minúsculas, números y guiones (mínimo 2 caracteres).');
  else if (RESERVED.includes(draft.slug)) e.push('Ese nombre de link está reservado, elige otro.');
  SOCIALS.forEach(([k, label]) => {
    if (trim(d.redes[k]) && !normSocial(k, d.redes[k])) e.push(`${label}: no entendí ese enlace.`);
  });
  if (!d.botones.length) e.push('Agrega al menos un botón.');
  d.botones.forEach((b, i) => {
    const n = `Botón ${i + 1} (${trim(b.texto) || 'sin texto'})`;
    if (!trim(b.texto)) e.push(`Botón ${i + 1}: falta el texto.`);
    if (b.tipo === 'whatsapp' && digits(b.numero).length < 8) e.push(`${n}: escribe el número de WhatsApp con código de país.`);
    if (b.tipo === 'link' && !safeUrl(b.url)) e.push(`${n}: falta el enlace.`);
    if (b.tipo === 'info' && !trim(b.contenido)) e.push(`${n}: falta el texto que se mostrará.`);
    if (b.tipo === 'mapa' && !trim(b.direccion) && !safeUrl(b.url)) e.push(`${n}: escribe la dirección.`);
    if (b.tipo === 'tel' && digits(b.telefono).length < 6) e.push(`${n}: falta el teléfono.`);
  });
  return e;
}
