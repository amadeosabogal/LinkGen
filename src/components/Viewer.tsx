import { useEffect, useState } from 'react';
import type { SiteData } from '../lib/types';
import { Store } from '../lib/store';
import { DEFAULT_THEME, subdomainSlug } from '../lib/util';
import SiteView from './SiteView';

type State = { status: 'loading' } | { status: 'ok'; data: SiteData } | { status: 'missing' } | { status: 'error' };

// El nombre del link viene de ?c=nombre o del primer tramo de la ruta (/nombre)
function slugFromLocation(): string {
  const q = new URLSearchParams(location.search).get('c');
  const seg = location.pathname.split('/').filter(Boolean)[0] ?? '';
  const slug = (subdomainSlug() || q || seg).toLowerCase();
  return /^[a-z0-9-]{1,60}$/.test(slug) ? slug : '';
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-6 text-center">
      <div>
        <h1 className="mb-2 text-xl font-bold">{title}</h1>
        <p className="text-slate-500">{text}</p>
      </div>
    </main>
  );
}

export default function Viewer() {
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    const slug = slugFromLocation();
    if (!slug) { setState({ status: 'missing' }); return; }
    let alive = true;
    Store.get(slug)
      .then((data) => alive && setState(data ? { status: 'ok', data } : { status: 'missing' }))
      .catch(() => alive && setState({ status: 'error' }));
    return () => { alive = false; };
  }, []);

  // título, icono y color de fondo del navegador según el negocio
  useEffect(() => {
    if (state.status !== 'ok') {
      document.title = state.status === 'loading' ? 'Cargando…' : 'Link no disponible';
      return;
    }
    const { marca, tema } = state.data;
    document.title = marca.nombre || 'Links';
    const bg = tema?.fondo || DEFAULT_THEME.fondo;
    document.body.style.background = bg;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', bg);
    if (marca.logo) {
      let l = document.querySelector<HTMLLinkElement>('link[rel=icon]');
      if (!l) { l = document.createElement('link'); l.rel = 'icon'; document.head.appendChild(l); }
      l.href = marca.logo;
    }
  }, [state]);

  if (state.status === 'loading') return null;
  if (state.status === 'missing') return <Message title="Este link no está disponible" text="Revisa que la dirección esté bien escrita." />;
  if (state.status === 'error') return <Message title="No pudimos cargar la página" text="Intenta de nuevo en unos minutos." />;
  return <SiteView data={state.data} />;
}
