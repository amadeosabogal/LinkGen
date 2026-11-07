import { useEffect, useRef, useState } from 'react';
import type { BgImage, Btn, BtnStyle, SiteData, SocialKey } from '../lib/types';
import { DEFAULT_THEME, hrefFor, iconFor, logoRing, metalButtonBg, safeUrl, themeVars } from '../lib/util';
import { Icon } from '../lib/icons';

const SOCIAL_ORDER: SocialKey[] = ['instagram', 'facebook', 'tiktok', 'youtube', 'web', 'maps'];
const SOCIAL_LABEL: Record<SocialKey, string> = {
  instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok', youtube: 'YouTube', web: 'Sitio web', maps: 'Google Maps'
};
const SOCIAL_ICON: Record<SocialKey, string> = {
  instagram: 'instagram', facebook: 'facebook', tiktok: 'tiktok', youtube: 'youtube', web: 'web', maps: 'pin'
};

const BTN_BASE =
  'relative flex min-h-[62px] w-full cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 px-14 py-3 text-center text-base leading-snug font-semibold no-underline transition focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[var(--text)]';
const BTN_METAL =
  '!border-[3px] !border-transparent text-[var(--on-primary)] shadow-[0_3px_10px_rgba(0,0,0,.35)] hover:-translate-y-0.5 hover:brightness-110';
const BTN_STYLE: Record<BtnStyle, string> = {
  solido:
    'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] hover:-translate-y-0.5 hover:brightness-110',
  sombra:
    'border-[var(--text)] bg-[var(--primary)] text-[var(--on-primary)] shadow-[4px_4px_0_var(--text)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0_var(--text)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-[1px_1px_0_var(--text)]',
  borde:
    'border-[var(--primary)] bg-transparent text-[var(--primary)] hover:-translate-y-0.5 hover:bg-[var(--primary)] hover:text-[var(--on-primary)]'
};

function InfoDialog({ b, onClose }: { b: Btn; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
      className="m-auto w-[min(92vw,460px)] rounded-[20px] border-0 bg-[var(--bg)] p-6 text-[var(--text)] shadow-2xl backdrop:bg-black/55"
    >
      <h2 className="mb-3 text-xl font-bold text-[var(--name)]">{b.texto}</h2>
      <p className="mb-5 text-[.95rem] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{b.contenido}</p>
      <button
        type="button"
        onClick={() => ref.current?.close()}
        className={`${BTN_BASE} ${BTN_STYLE.solido} !min-h-12 !px-5 !py-2.5`}
      >
        Cerrar
      </button>
    </dialog>
  );
}

const SAFE_IMG = /^data:image\/[\w+.-]+;base64,[A-Za-z0-9+/=]+$/;

/** Imagen de fondo con sus ajustes. Va detrás de todo el contenido. */
function BgLayer({ bg, preview }: { bg: BgImage; preview: boolean }) {
  if (!SAFE_IMG.test(bg.src)) return null;
  const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, Number(n) || 0));
  const blur = clamp(bg.desenfoque, 0, 20);
  return (
    <div
      aria-hidden
      className={`${bg.fijo && !preview ? 'fixed' : 'absolute'} inset-x-0 -z-10 pointer-events-none ${bg.fijo && !preview ? '-top-24 -bottom-24' : 'inset-y-0'}`}
      style={{
        backgroundImage: `url("${bg.src}")`,
        backgroundSize: { cubrir: 'cover', ancho: '100% auto', mosaico: 'auto' }[bg.ajuste] ?? 'cover',
        backgroundPosition: { arriba: 'center top', centro: 'center', abajo: 'center bottom' }[bg.posicion] ?? 'center',
        backgroundRepeat: bg.ajuste === 'mosaico' ? 'repeat' : 'no-repeat',
        opacity: clamp(bg.opacidad, 0, 100) / 100,
        filter: `blur(${blur}px) brightness(${clamp(bg.brillo, 40, 160)}%)`,
        transform: `translate(${clamp(bg.x ?? 0, -100, 100)}%, ${clamp(bg.y ?? 0, -100, 100)}%) scale(${(bg.zoom ? clamp(bg.zoom, 50, 300) : 100) / 100 * (blur > 0 ? 1.1 : 1)})`
      }}
    />
  );
}

interface Item { key: string; btn: Btn }

/** Todos los botones visibles (propios + redes) en el orden en que se muestran. */
export function orderedItems(data: SiteData): Item[] {
  const own: Item[] = data.botones.flatMap((b, idx) => {
    if (!b.texto?.trim()) return [];
    return (b.tipo === 'info' ? Boolean(b.contenido) : Boolean(hrefFor(b))) ? [{ key: 'b:' + (b.id ?? idx), btn: b }] : [];
  });
  const social: Item[] = SOCIAL_ORDER.flatMap((k) => {
    const url = safeUrl(data.redes[k]);
    return url
      ? [{ key: 'r:' + k, btn: { id: 'red-' + k, tipo: 'link' as const, texto: SOCIAL_LABEL[k], url, icono: SOCIAL_ICON[k] } }]
      : [];
  });
  const all = [...own, ...social];
  const rank = new Map((data.orden ?? []).map((k, i) => [k, i] as const));
  // orden estable: los que tienen posición guardada van según ella; el resto conserva su orden y va después
  return all
    .map((it, i) => ({ it, i }))
    .sort((x, y) => {
      const rx = rank.get(x.it.key), ry = rank.get(y.it.key);
      if (rx !== undefined && ry !== undefined) return rx - ry;
      if (rx !== undefined) return -1;
      if (ry !== undefined) return 1;
      return x.i - y.i;
    })
    .map((x) => x.it);
}

/** Dibuja una página de links. La usan la página pública y la vista previa del panel. */
export default function SiteView({ data, preview = false, onReorder }: {
  data: SiteData; preview?: boolean;
  /** Si se pasa, todos los botones se pueden arrastrar; recibe el nuevo orden completo. */
  onReorder?: (keys: string[]) => void;
}) {
  const [info, setInfo] = useState<Btn | null>(null);
  const [drag, setDrag] = useState<{ from: string; over: string | null } | null>(null);
  const t = { ...DEFAULT_THEME, ...data.tema };
  const m = data.marca;
  const items = orderedItems(data);

  // En el celular, pinta del color del fondo las barras del navegador y la zona de rebote al hacer scroll
  const pageBg = (themeVars(t) as Record<string, string>)['--bg'];
  useEffect(() => {
    if (preview) return;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
    const prevMeta = meta.content, prevBg = document.documentElement.style.backgroundColor;
    meta.content = pageBg;
    document.documentElement.style.backgroundColor = pageBg;
    document.body.style.backgroundColor = pageBg;
    return () => { meta!.content = prevMeta; document.documentElement.style.backgroundColor = prevBg; document.body.style.backgroundColor = ''; };
  }, [pageBg, preview]);

  return (
    <div
      style={themeVars(t)}
      className="relative isolate min-h-full overflow-hidden bg-[var(--bg)] font-sans text-[var(--text)]"
    >
      {t.imagenFondo && <BgLayer bg={t.imagenFondo} preview={preview} />}
      <main className="mx-auto flex max-w-[560px] flex-col items-center px-5 pt-11 pb-16 text-center">
        {(() => {
          const ring = logoRing(t);
          const face = m.logo ? (
            <img src={m.logo} alt={m.nombre || 'Logo'} className={`size-24 rounded-full bg-white object-cover ${ring ? '' : 'shadow-md'}`} />
          ) : (
            m.nombre && (
              <div className={`grid size-24 place-items-center rounded-full bg-[var(--primary)] text-[40px] font-bold text-[var(--on-primary)] ${ring ? '' : 'shadow-md'}`}>
                {m.nombre.trim().charAt(0).toUpperCase()}
              </div>
            )
          );
          return ring && face ? <div className="rounded-full shadow-md" style={ring}>{face}</div> : face;
        })()}
        {m.nombre && <h1 className="mt-4 mb-1.5 text-[1.65rem] leading-tight font-bold text-[var(--name)] [overflow-wrap:anywhere]">{m.nombre}</h1>}
        {m.bio && <p className={`max-w-[440px] text-[.95rem] leading-relaxed text-[var(--bio)] ${t.negritaDescripcion ? 'font-bold' : ''} opacity-90 [overflow-wrap:anywhere]`}>{m.bio}</p>}

        <div className="mt-[26px] flex w-full flex-col gap-3.5">
          {items.map(({ key, btn: b }, i) => {
            const icon = iconFor(b);
            const sub = b.subtexto || (b.tipo === 'mapa' ? b.direccion : '');
            const metal = t.acabado === 'oro' || t.acabado === 'plata' ? t.acabado : null;
            const cls = `${BTN_BASE} ${metal ? BTN_METAL : BTN_STYLE[t.estiloBoton]} ${preview ? '' : 'animate-rise motion-reduce:animate-none'}`;
            const canDrag = Boolean(onReorder);
            const dragProps = canDrag ? {
              draggable: true,
              onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); setDrag({ from: key, over: null }); },
              onDragOver: (e: React.DragEvent) => { if (!drag) return; e.preventDefault(); if (drag.over !== key) setDrag({ ...drag, over: key }); },
              onDrop: (e: React.DragEvent) => {
                e.preventDefault();
                if (drag && drag.from !== key) {
                  const keys = items.map((x) => x.key);
                  keys.splice(keys.indexOf(drag.from), 1);
                  keys.splice(keys.indexOf(key), 0, drag.from);
                  onReorder!(keys);
                }
                setDrag(null);
              },
              onDragEnd: () => setDrag(null)
            } : {};
            const dragStyle = canDrag ? {
              cursor: 'grab',
              ...(drag?.from === key ? { opacity: 0.4 } : {}),
              ...(drag && drag.over === key && drag.from !== key ? { outline: '3px dashed #6366f1', outlineOffset: 4 } : {})
            } : {};
            const style = { animationDelay: `${i * 60}ms`, ...dragStyle, ...(metal ? { background: metalButtonBg(metal) } : {}) };
            const inner = (
              <>
                {icon && <Icon name={icon} className="absolute top-1/2 left-[18px] size-[26px] -translate-y-1/2" />}
                <span className="[overflow-wrap:anywhere]">{b.texto}</span>
                {sub && <span className="mt-0.5 text-[.78rem] font-normal opacity-90">{sub}</span>}
              </>
            );
            if (b.tipo === 'info') {
              return (
                <button key={key} type="button" className={cls} style={style} onClick={() => setInfo(b)} {...dragProps}>
                  {inner}
                </button>
              );
            }
            const href = hrefFor(b)!;
            const external = /^https?:/i.test(href);
            return (
              <a
                key={key}
                href={href}
                className={cls}
                style={style}
                {...dragProps}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {inner}
              </a>
            );
          })}
        </div>
      </main>
      {info && <InfoDialog b={info} onClose={() => setInfo(null)} />}
    </div>
  );
}
