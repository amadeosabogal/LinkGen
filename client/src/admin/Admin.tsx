import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SiteView from '../components/SiteView';
import { mode, Store, type User } from '../lib/store';
import type { Draft, Row } from '../lib/types';
import { linkFor } from '../lib/util';
import { PRESETS } from '../lib/presets';
import { cleanData, draftFromPreset, draftFromRow, errMsg, validate } from './editorState';
import { DoneDialog, RubroDialog } from './Dialogs';
import { btnGhost, btnPrimary, IconBtn } from './fields';
import Login from './Login';
import { SecBotones, SecDiseno, SecNegocio, SecRedes } from './Sections';

export default function Admin() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    document.title = 'LinkGen · Panel';
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    Store.user().then(setUser).catch(() => setUser(null));
    return () => meta.remove();
  }, []);

  if (user === undefined) return null;
  if (user === null) return <Login onDone={setUser} />;
  return <Panel user={user} />;
}

function Panel({ user }: { user: User }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [rubroMode, setRubroMode] = useState<'new' | 'change' | null>(null);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState('');
  const errRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2400);
  }, []);

  const refresh = useCallback(async () => {
    try { setRows(await Store.list()); } catch (e) { notify('No pude cargar tus clientes: ' + errMsg(e)); }
  }, [notify]);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  useEffect(() => {
    if (errors.length) errRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errors]);

  const preview = useMemo(() => (draft ? cleanData(draft.data) : null), [draft]);
  const guard = () => !dirty || confirm('Tienes cambios sin publicar. ¿Descartarlos?');

  const edit = useCallback((fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
  }, []);

  const reorderButtons = useCallback((keys: string[]) => {
    edit((d) => ({ ...d, data: { ...d.data, orden: keys } }));
  }, [edit]);

  async function copy(text: string) {
    try { await navigator.clipboard.writeText(text); notify('Link copiado'); }
    catch { notify('No pude copiar. Selecciónalo y cópialo a mano.'); }
  }

  function pickRubro(key: string) {
    if (rubroMode === 'change' && draft) {
      if (!confirm('Se reemplazarán los botones y el diseño actuales por los de la plantilla. Se conservan el nombre, el logo, las redes y el link. ¿Continuar?')) return;
      const n = draftFromPreset(key);
      n.data.marca.nombre = draft.data.marca.nombre;
      n.data.marca.logo = draft.data.marca.logo;
      n.data.redes = draft.data.redes;
      n.slug = draft.slug; n.originalSlug = draft.originalSlug; n.slugTouched = draft.slugTouched;
      setDraft(n);
      setDirty(true);
    } else {
      setDraft(draftFromPreset(key));
      setDirty(false);
    }
    setErrors([]);
    setRubroMode(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openRow(r: Row) {
    if (!guard()) return;
    setDraft(draftFromRow(r.slug, r.data));
    setDirty(false);
    setErrors([]);
    setShowPreview(false);
    window.scrollTo({ top: 0 });
  }

  async function removeRow(r: Row) {
    const name = r.data.marca?.nombre || r.slug;
    if (!confirm(`¿Eliminar el link de “${name}”? Dejará de funcionar para todos y no se puede deshacer.`)) return;
    try {
      await Store.remove(r.slug);
      if (draft?.originalSlug === r.slug) { setDraft(null); setDirty(false); }
      await refresh();
      notify('Link eliminado');
    } catch (e) { notify('No se pudo eliminar: ' + errMsg(e)); }
  }

  async function publish() {
    if (!draft) return;
    const errs = validate(draft);
    setErrors(errs);
    if (errs.length) return;
    setPublishing(true);
    try {
      if (draft.slug !== draft.originalSlug && (await Store.exists(draft.slug))) {
        setErrors(['Ese nombre de link ya está en uso. Elige otro.']);
        return;
      }
      if (draft.originalSlug && draft.slug !== draft.originalSlug &&
        !confirm('Cambiaste la dirección del link. El link anterior dejará de funcionar. ¿Continuar?')) return;
      await Store.save(draft.slug, cleanData(draft.data), draft.originalSlug);
      setDraft({ ...draft, originalSlug: draft.slug });
      setDirty(false);
      await refresh();
      setDone(true);
    } catch (e) {
      setErrors(['No se pudo publicar: ' + errMsg(e)]);
    } finally {
      setPublishing(false);
    }
  }

  const sec = { draft: draft!, edit, notify };
  const isNew = !draft?.originalSlug;

  return (
    <div className="min-h-screen bg-slate-100 text-[15px] text-slate-900">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-5">
        <div className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight">
          <span className="size-[18px] rounded-md bg-gradient-to-br from-indigo-600 to-violet-400" />LinkGen
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[12.5px] font-semibold ${mode === 'local' ? 'bg-amber-50 text-amber-800' : 'bg-indigo-50 text-indigo-700'}`}>
          {mode === 'local' ? 'Modo prueba · datos solo en este navegador' : user.email}
        </span>
        <span className="flex-1" />
        {mode !== 'local' && (
          <button
            type="button" className={btnGhost}
            onClick={async () => { if (guard()) { setDirty(false); await Store.signOut(); location.reload(); } }}
          >
            Salir
          </button>
        )}
      </header>

      <div className="mx-auto grid max-w-[1480px] items-start gap-6 px-5 pt-6 pb-10 lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[270px_minmax(0,1fr)_380px]">
        {/* clientes */}
        <aside className="lg:sticky lg:top-20">
          <button type="button" className={`${btnPrimary} w-full`} onClick={() => { if (guard()) setRubroMode('new'); }}>
            ＋ Generar nuevo link
          </button>
          <h2 className="mt-5 mb-2.5 text-xs font-semibold tracking-widest text-slate-500 uppercase">Mis clientes</h2>
          <ul className="grid max-h-60 gap-2 overflow-auto lg:max-h-[calc(100vh-220px)]">
            {rows.length === 0 && <li className="text-[13.5px] text-slate-500">Aún no has creado ningún link.</li>}
            {rows.map((r) => {
              const m = r.data.marca;
              const on = draft?.originalSlug === r.slug;
              return (
                <li key={r.slug} className={`flex items-center gap-1 rounded-xl border bg-white p-1 ${on ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-slate-200'}`}>
                  <button type="button" onClick={() => openRow(r)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg p-1.5 text-left hover:bg-slate-100">
                    <span className="grid size-9 flex-none place-items-center overflow-hidden rounded-full bg-indigo-600 font-bold text-white">
                      {m?.logo ? <img src={m.logo} alt="" className="size-full bg-white object-cover" /> : (m?.nombre || r.slug).charAt(0).toUpperCase()}
                    </span>
                    <span className="grid min-w-0">
                      <strong className="truncate">{m?.nombre || r.slug}</strong>
                      <small className="truncate text-slate-500">/{r.slug}</small>
                    </span>
                  </button>
                  <div className="flex gap-0.5 pr-0.5">
                    <IconBtn title="Copiar link" onClick={() => void copy(linkFor(r.slug))}>⧉</IconBtn>
                    <IconBtn title="Abrir página" onClick={() => window.open(linkFor(r.slug), '_blank', 'noopener')}>↗</IconBtn>
                    <IconBtn title="Eliminar" onClick={() => void removeRow(r)}>🗑</IconBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* editor */}
        <main className="w-full max-w-[760px]">
          {!draft ? (
            <div className="rounded-[14px] border border-slate-200 bg-white px-6 py-14 text-center">
              <h1 className="mb-2 text-[22px] font-bold">Genera el link de un cliente</h1>
              <p className="text-[13.5px] text-slate-500">Elige el rubro, completa los datos del negocio y pulsa “Finalizar y publicar”. Te doy el link listo para compartir.</p>
              <button type="button" className={`${btnPrimary} mt-5`} onClick={() => setRubroMode('new')}>＋ Generar nuevo link</button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{isNew ? 'Nuevo link' : 'Editar link'}</h1>
                  <p className="mt-1 text-[13.5px] text-slate-500">Plantilla: {PRESETS[draft.data.rubro]?.etiqueta ?? 'Personalizada'}</p>
                </div>
                <button type="button" className={btnGhost} onClick={() => setRubroMode('change')}>Cambiar plantilla</button>
              </div>

              {errors.length > 0 && (
                <div ref={errRef} role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900">
                  <strong>Falta arreglar esto para publicar:</strong>
                  <ul className="mt-1.5 list-disc pl-5">{errors.map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
              )}

              <SecNegocio {...sec} />
              <SecRedes {...sec} />
              <SecBotones {...sec} />
              <SecDiseno {...sec} />

              <div className="sticky bottom-0 flex flex-col gap-3 bg-gradient-to-t from-slate-100 from-75% to-transparent py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid min-w-0">
                  <small className="text-slate-500">Se publicará en</small>
                  <span className="font-mono text-[12.5px] break-all">{linkFor(draft.slug || 'nombre')}</span>
                </div>
                <button type="button" className={btnPrimary} disabled={publishing} onClick={() => void publish()}>
                  {publishing ? 'Publicando…' : isNew ? 'Finalizar y publicar' : 'Guardar cambios y publicar'}
                </button>
              </div>
            </>
          )}
        </main>

        {/* vista previa */}
        <aside
          className={`${showPreview ? 'fixed inset-x-0 top-14 bottom-0 z-30 block overflow-auto bg-slate-100/95 p-4' : 'hidden'} xl:sticky xl:top-20 xl:block xl:bg-transparent xl:p-0`}
        >
          <div className="mx-auto h-[min(720px,calc(100vh-112px))] w-full max-w-[360px] overflow-hidden rounded-[38px] border-[10px] border-neutral-900 bg-white shadow-2xl">
            <div className="h-full overflow-y-auto">
              {preview ? <SiteView data={preview} preview onReorder={reorderButtons} /> : <p className="mt-[40%] text-center text-sm text-slate-400">Vista previa</p>}
            </div>
          </div>
          <p className="mx-auto mt-2.5 max-w-[360px] text-center text-[12.5px] text-slate-500">Arrastra los botones en la vista previa para cambiar su orden.</p>
        </aside>
      </div>

      <button
        type="button" onClick={() => setShowPreview((v) => !v)}
        className="fixed right-4 bottom-24 z-40 rounded-full bg-slate-900 px-[18px] py-3 font-semibold text-white shadow-lg xl:hidden"
      >
        {showPreview ? 'Cerrar vista previa' : 'Vista previa'}
      </button>

      {rubroMode && <RubroDialog onPick={pickRubro} onClose={() => setRubroMode(null)} />}
      {done && draft && (
        <DoneDialog
          link={linkFor(draft.slug)} slug={draft.slug} isLocal={mode === 'local'}
          onCopy={(t) => void copy(t)} onClose={() => setDone(false)}
        />
      )}

      <div
        role="status" aria-live="polite"
        className={`pointer-events-none fixed bottom-7 left-1/2 z-50 -translate-x-1/2 rounded-full bg-neutral-900 px-[18px] py-2.5 text-sm text-white transition ${toast ? 'opacity-100' : 'translate-y-5 opacity-0'}`}
      >
        {toast}
      </div>
    </div>
  );
}
