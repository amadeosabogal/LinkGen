import { useEffect, useRef, useState } from 'react';
import type { Btn, BtnStyle, SiteData, SocialKey } from '../lib/types';
import { DEFAULT_THEME, hrefFor, iconFor, safeUrl, themeVars } from '../lib/util';
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

/** Dibuja una página de links. La usan la página pública y la vista previa del panel. */
export default function SiteView({ data, preview = false }: { data: SiteData; preview?: boolean }) {
  const [info, setInfo] = useState<Btn | null>(null);
  const t = { ...DEFAULT_THEME, ...data.tema };
  const m = data.marca;

  const main_ = data.botones.filter((b) => {
    if (!b.texto?.trim()) return false;
    return b.tipo === 'info' ? Boolean(b.contenido) : Boolean(hrefFor(b));
  });
  // Las redes sociales y Google Maps salen como botones al final
  const socialBtns: Btn[] = SOCIAL_ORDER.flatMap((k) => {
    const url = safeUrl(data.redes[k]);
    return url ? [{ id: 'red-' + k, tipo: 'link' as const, texto: SOCIAL_LABEL[k], url, icono: SOCIAL_ICON[k] }] : [];
  });
  const visible = [...main_, ...socialBtns];

  return (
    <div
      style={themeVars(t)}
      className="min-h-full bg-[var(--bg)] font-sans text-[var(--text)]"
    >
      <main className="mx-auto flex max-w-[560px] flex-col items-center px-5 pt-11 pb-16 text-center">
        {m.logo ? (
          <img src={m.logo} alt={m.nombre || 'Logo'} className="size-24 rounded-full bg-white object-cover shadow-md" />
        ) : (
          m.nombre && (
            <div className="grid size-24 place-items-center rounded-full bg-[var(--primary)] text-[40px] font-bold text-[var(--on-primary)] shadow-md">
              {m.nombre.trim().charAt(0).toUpperCase()}
            </div>
          )
        )}
        {m.nombre && <h1 className="mt-4 mb-1.5 text-[1.65rem] leading-tight font-bold text-[var(--name)] [overflow-wrap:anywhere]">{m.nombre}</h1>}
        {m.bio && <p className="max-w-[440px] text-[.95rem] leading-relaxed opacity-90 [overflow-wrap:anywhere]">{m.bio}</p>}

        <div className="mt-[26px] flex w-full flex-col gap-3.5">
          {visible.map((b, i) => {
            const icon = iconFor(b);
            const sub = b.subtexto || (b.tipo === 'mapa' ? b.direccion : '');
            const cls = `${BTN_BASE} ${BTN_STYLE[t.estiloBoton]} ${preview ? '' : 'animate-rise motion-reduce:animate-none'}`;
            const style = { animationDelay: `${i * 60}ms` };
            const inner = (
              <>
                {icon && <Icon name={icon} className="absolute top-1/2 left-[18px] size-[26px] -translate-y-1/2" />}
                <span className="[overflow-wrap:anywhere]">{b.texto}</span>
                {sub && <span className="mt-0.5 text-[.78rem] font-normal opacity-90">{sub}</span>}
              </>
            );
            if (b.tipo === 'info') {
              return (
                <button key={b.id ?? i} type="button" className={cls} style={style} onClick={() => setInfo(b)}>
                  {inner}
                </button>
              );
            }
            const href = hrefFor(b)!;
            const external = /^https?:/i.test(href);
            return (
              <a
                key={b.id ?? i}
                href={href}
                className={cls}
                style={style}
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
