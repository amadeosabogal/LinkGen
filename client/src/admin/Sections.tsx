import { useEffect, useRef, useState } from 'react';
import type { BgImage, BtnStyle, BtnType, Draft, EditorData, FullBtn, Shape } from '../lib/types';
import { Store } from '../lib/store';
import { linkFor, slugify } from '../lib/util';
import { emptyBtn, SOCIALS } from './editorState';
import {
  AreaField, btnGhost, Card, ColorField, FieldBox, IconBtn, inputCls, SelectField, Seg, TextField
} from './fields';

export interface SectionProps {
  draft: Draft;
  edit: (fn: (d: Draft) => Draft) => void;
  notify: (msg: string) => void;
}

const TIPOS: [BtnType, string][] = [
  ['whatsapp', 'WhatsApp'],
  ['link', 'Enlace web'],
  ['info', 'Texto informativo (ventana)'],
  ['mapa', 'Mapa / Cómo llegar'],
  ['tel', 'Llamar por teléfono']
];
const ICONOS: [string, string][] = [
  ['auto', 'Automático'], ['none', 'Sin icono'], ['whatsapp', 'WhatsApp'], ['instagram', 'Instagram'],
  ['facebook', 'Facebook'], ['tiktok', 'TikTok'], ['youtube', 'YouTube'], ['pin', 'Ubicación'],
  ['phone', 'Teléfono'], ['info', 'Información'], ['star', 'Estrella'], ['gift', 'Regalo'],
  ['list', 'Lista / carta'], ['calendar', 'Calendario'], ['web', 'Web'], ['link', 'Enlace']
];
const PALETAS = [
  { n: 'Lila', p: '#8E5AA8', bg: '#F6F0F8', tx: '#2B2133' },
  { n: 'Azul', p: '#0B4FBF', bg: '#F0F0F0', tx: '#111111' },
  { n: 'Rosa', p: '#D6457A', bg: '#FFF1F5', tx: '#3A1B26' },
  { n: 'Verde', p: '#2F7D5B', bg: '#EEF6F1', tx: '#14281F' },
  { n: 'Naranja', p: '#E8590C', bg: '#FFF4EC', tx: '#2D1608' },
  { n: 'Dorado sobre negro', p: '#C8A24A', bg: '#121212', tx: '#F2F2F2' },
  { n: 'Negro', p: '#111111', bg: '#FFFFFF', tx: '#111111' }
];

const useSetData = (edit: SectionProps['edit']) => (fn: (d: EditorData) => EditorData) =>
  edit((d) => ({ ...d, data: fn(d.data) }));

function resizeImage(file: File, size: number): Promise<string> {
  return new Promise((ok, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = size / Math.max(img.width, img.height);
      const w = Math.round(img.width * k), h = Math.round(img.height * k);
      const c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d')!.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/webp', 0.88));
    };
    img.onerror = () => fail(new Error('imagen no válida'));
    img.src = url;
  });
}

/** Reduce la imagen (lado mayor = max) conservando su proporción. */
function resizeKeepRatio(file: File, max: number): Promise<string> {
  return new Promise((ok, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/webp', 0.8));
    };
    img.onerror = () => fail(new Error('imagen no válida'));
    img.src = url;
  });
}

function Slider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void;
}) {
  return (
    <label className="mb-3.5 grid gap-1">
      <span className="flex justify-between text-[13px] font-semibold">
        {label}<span className="font-mono font-normal text-slate-500">{value}{unit}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-indigo-600" />
    </label>
  );
}

function BgImageField({ value, onChange, notify }: {
  value: BgImage | undefined; onChange: (v: BgImage | undefined) => void; notify: (m: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<BgImage>) => value && onChange({ ...value, ...patch });
  return (
    <FieldBox label="Imagen de fondo" hint="Se coloca detrás de los botones. Usa una imagen que no distraiga.">
      <div className="flex items-center gap-3.5">
        <div
          className="size-[72px] rounded-[10px] border border-dashed border-slate-400 bg-slate-50 bg-cover bg-center"
          style={value ? { backgroundImage: `url("${value.src}")` } : undefined}
        />
        <button type="button" className={btnGhost} onClick={() => ref.current?.click()}>
          {value ? 'Cambiar imagen' : 'Subir imagen'}
        </button>
        {value && <button type="button" className={btnGhost} onClick={() => onChange(undefined)}>Quitar</button>}
        <input
          ref={ref} type="file" accept="image/*" hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              const src = await resizeKeepRatio(f, 1400);
              onChange({
                opacidad: 100, desenfoque: 0, brillo: 100, ajuste: 'cubrir', posicion: 'centro', fijo: true,
                ...value, src
              });
            } catch { notify('No pude leer esa imagen'); }
          }}
        />
      </div>
      {value && (
        <div className="mt-3">
          <Slider label="Opacidad" value={value.opacidad} min={0} max={100} unit="%" onChange={(v) => set({ opacidad: v })} />
          <Slider label="Desenfoque" value={value.desenfoque} min={0} max={20} unit="px" onChange={(v) => set({ desenfoque: v })} />
          <Slider label="Brillo" value={value.brillo} min={40} max={160} unit="%" onChange={(v) => set({ brillo: v })} />
          <Seg<BgImage['ajuste']>
            label="Ajuste" value={value.ajuste} onChange={(v) => set({ ajuste: v })}
            options={[['cubrir', 'Cubrir'], ['ancho', 'Ancho completo'], ['mosaico', 'Mosaico']]}
          />
          <Seg<BgImage['posicion']>
            label="Posición" value={value.posicion} onChange={(v) => set({ posicion: v })}
            options={[['arriba', 'Arriba'], ['centro', 'Centro'], ['abajo', 'Abajo']]}
          />
          <label className="flex items-center gap-2 text-[13.5px]">
            <input type="checkbox" checked={value.fijo} onChange={(e) => set({ fijo: e.target.checked })} className="size-4 accent-indigo-600" />
            Fija: no se mueve al hacer scroll
          </label>
        </div>
      )}
    </FieldBox>
  );
}

function OptionalColor({ label, hint, value, fallback, onChange }: {
  label: string; hint: string; value: string | undefined; fallback: string; onChange: (v: string) => void;
}) {
  return (
    <FieldBox label={label} hint={hint}>
      <div className="flex items-center gap-2.5">
        <input
          type="color" aria-label={label} value={value || fallback} onChange={(e) => onChange(e.target.value)}
          className="h-[38px] w-11 rounded-lg border border-slate-300 bg-white p-0.5"
        />
        <code className="font-mono text-[12.5px]">{value || 'Automático'}</code>
        {value && <button type="button" className={btnGhost} onClick={() => onChange('')}>Restablecer</button>}
      </div>
    </FieldBox>
  );
}

function LogoField({ logo, onChange, notify }: { logo: string; onChange: (v: string) => void; notify: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <FieldBox label="Logo" hint="Mejor si es cuadrado o redondo. Se ajusta solo.">
      <div className="flex items-center gap-3.5">
        <div className="grid size-[72px] place-items-center overflow-hidden rounded-full border border-dashed border-slate-400 bg-slate-50 text-[11px] text-slate-500">
          {logo ? <img src={logo} alt="Logo" className="size-full bg-white object-cover" /> : 'Sin logo'}
        </div>
        <button type="button" className={btnGhost} onClick={() => ref.current?.click()}>Subir logo</button>
        {logo && <button type="button" className={btnGhost} onClick={() => onChange('')}>Quitar</button>}
        <input
          ref={ref} type="file" accept="image/*" hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try { onChange(await resizeImage(f, 320)); } catch { notify('No pude leer esa imagen'); }
          }}
        />
      </div>
    </FieldBox>
  );
}

function SlugField({ draft, edit }: Pick<SectionProps, 'draft' | 'edit'>) {
  const [status, setStatus] = useState<'idle' | 'free' | 'taken'>('idle');
  const { slug, originalSlug } = draft;

  useEffect(() => {
    if (!slug || slug === originalSlug) { setStatus('idle'); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try { const taken = await Store.exists(slug); if (alive) setStatus(taken ? 'taken' : 'free'); }
      catch { /* sin conexión: se comprueba al publicar */ }
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [slug, originalSlug]);

  return (
    <FieldBox label="Dirección del link" hint="Es lo que le darás a tu cliente. Si lo cambias después, el link anterior deja de funcionar.">
      <input
        type="text" value={slug} placeholder="mi-negocio" maxLength={40} autoComplete="off"
        aria-label="Nombre del link" className={inputCls}
        onChange={(e) => {
          const v = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          edit((d) => ({ ...d, slugTouched: true, slug: v }));
        }}
        onBlur={() => { if (slugify(slug) !== slug) edit((d) => ({ ...d, slug: slugify(d.slug) })); }}
      />
      <small className={`min-h-[1.2em] text-[12.5px] ${status === 'taken' ? 'text-red-700' : 'text-green-700'}`}>
        {status === 'taken' ? '✖ Ese link ya está en uso' : status === 'free' ? '✔ Disponible' : ''}
      </small>
      <small className="font-mono text-[12.5px] break-all text-slate-500">Tu link: {linkFor(slug || 'nombre')}</small>
    </FieldBox>
  );
}

export function SecNegocio({ draft, edit, notify }: SectionProps) {
  const setData = useSetData(edit);
  const m = draft.data.marca;
  return (
    <Card title="Negocio" sub="Lo que aparece arriba de la página.">
      <TextField
        label="Nombre del negocio" value={m.nombre} max={50} placeholder="Ej: Lumi Spa"
        onChange={(v) => edit((d) => ({
          ...d,
          slug: !d.slugTouched && !d.originalSlug ? slugify(v) : d.slug,
          data: { ...d.data, marca: { ...d.data.marca, nombre: v } }
        }))}
      />
      <TextField
        label="Descripción corta" value={m.bio} max={120} placeholder="Ej: Spa de belleza y bienestar 🌿"
        onChange={(v) => setData((d) => ({ ...d, marca: { ...d.marca, bio: v } }))}
      />
      <OptionalColor
        label="Color del nombre" hint="Si no eliges uno, se calcula solo a partir del color principal."
        value={draft.data.tema.colorNombre} fallback={draft.data.tema.colorPrincipal}
        onChange={(v) => setData((d) => ({ ...d, tema: { ...d.tema, colorNombre: v } }))}
      />
      <OptionalColor
        label="Color de la descripción" hint="Si no eliges uno, usa el color de texto del diseño."
        value={draft.data.tema.colorDescripcion} fallback={draft.data.tema.texto}
        onChange={(v) => setData((d) => ({ ...d, tema: { ...d.tema, colorDescripcion: v } }))}
      />
      <LogoField logo={m.logo} notify={notify} onChange={(v) => setData((d) => ({ ...d, marca: { ...d.marca, logo: v } }))} />
      <SlugField draft={draft} edit={edit} />
    </Card>
  );
}

export function SecRedes({ draft, edit }: SectionProps) {
  const setData = useSetData(edit);
  return (
    <Card title="Redes sociales" sub="Cada una aparece como un botón al final de la página. Deja vacías las que no use.">
      <div className="grid gap-x-3.5 sm:grid-cols-2">
        {SOCIALS.map(([k, label, ph]) => (
          <TextField
            key={k} label={label} placeholder={ph} value={draft.data.redes[k]}
            onChange={(v) => setData((d) => ({ ...d, redes: { ...d.redes, [k]: v } }))}
          />
        ))}
      </div>
    </Card>
  );
}

function BtnCard({ b, i, total, setData }: { b: FullBtn; i: number; total: number; setData: ReturnType<typeof useSetData> }) {
  const upd = (patch: Partial<FullBtn>) =>
    setData((d) => ({ ...d, botones: d.botones.map((x) => (x.id === b.id ? { ...x, ...patch } : x)) }));
  const move = (dir: -1 | 1) =>
    setData((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.botones.length) return d;
      const arr = [...d.botones];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...d, botones: arr };
    });
  const del = () => setData((d) => ({ ...d, botones: d.botones.filter((x) => x.id !== b.id) }));

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-3 py-2.5">
        <span className="grid size-6 flex-none place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">{i + 1}</span>
        <div className="flex-1">
          <SelectField label="Tipo de botón" srOnly value={b.tipo} options={TIPOS} onChange={(v) => upd({ tipo: v as BtnType })} />
        </div>
        <div className="flex gap-1.5">
          <IconBtn title="Subir" disabled={i === 0} onClick={() => move(-1)}>▲</IconBtn>
          <IconBtn title="Bajar" disabled={i === total - 1} onClick={() => move(1)}>▼</IconBtn>
          <IconBtn title="Eliminar botón" onClick={del}>✕</IconBtn>
        </div>
      </div>
      <div className="px-3 pt-3.5 pb-1">
        <TextField label="Texto del botón" value={b.texto} max={60} placeholder="Ej: Reserva tu cita" onChange={(v) => upd({ texto: v })} />
        {b.tipo === 'whatsapp' && (
          <>
            <TextField
              label="Número de WhatsApp" value={b.numero} placeholder="51987654321"
              hint="Con código de país, sin + ni espacios. Perú: 51 + el número." onChange={(v) => upd({ numero: v })}
            />
            <AreaField
              label="Mensaje que se escribe solo" value={b.mensaje} placeholder="Hola, quiero reservar una cita…"
              hint="Así el cliente solo toca “enviar”." onChange={(v) => upd({ mensaje: v })}
            />
          </>
        )}
        {b.tipo === 'link' && (
          <TextField
            label="Enlace" type="url" value={b.url} placeholder="https://…"
            hint="Para un PDF o una carta, pega el link de Google Drive, Dropbox, etc." onChange={(v) => upd({ url: v })}
          />
        )}
        {b.tipo === 'info' && (
          <AreaField
            label="Texto que se muestra al tocar" value={b.contenido}
            hint="Se abre en una ventana. Los saltos de línea se respetan." onChange={(v) => upd({ contenido: v })}
          />
        )}
        {b.tipo === 'mapa' && (
          <>
            <TextField
              label="Dirección" value={b.direccion} placeholder="Av. Larco 123, Miraflores"
              hint="Abre Google Maps con esta búsqueda." onChange={(v) => upd({ direccion: v })}
            />
            <TextField
              label="Link de Google Maps (opcional)" type="url" value={b.url} placeholder="https://maps.app.goo.gl/…"
              hint="Si lo pones, se usa este en lugar de la búsqueda." onChange={(v) => upd({ url: v })}
            />
          </>
        )}
        {b.tipo === 'tel' && (
          <TextField label="Teléfono" value={b.telefono} placeholder="+51 987 654 321" onChange={(v) => upd({ telefono: v })} />
        )}
        <div className="mb-3.5 grid gap-3.5 sm:grid-cols-2">
          <TextField
            label="Subtexto (opcional)" value={b.subtexto} max={70}
            placeholder={b.tipo === 'mapa' ? 'Si lo dejas vacío, muestra la dirección' : 'Línea pequeña bajo el texto'}
            onChange={(v) => upd({ subtexto: v })}
          />
          <FieldBox label="Icono">
            <SelectField label="Icono" srOnly value={b.icono} options={ICONOS} onChange={(v) => upd({ icono: v })} />
          </FieldBox>
        </div>
      </div>
    </div>
  );
}

export function SecBotones({ draft, edit }: SectionProps) {
  const setData = useSetData(edit);
  const list = draft.data.botones;
  return (
    <Card title="Botones" sub="Los enlaces que verá la gente, en este orden.">
      <div className="grid gap-3">
        {list.map((b, i) => <BtnCard key={b.id} b={b} i={i} total={list.length} setData={setData} />)}
      </div>
      <button
        type="button" className={`${btnGhost} mt-3`}
        onClick={() => setData((d) => ({ ...d, botones: [...d.botones, emptyBtn('link')] }))}
      >
        ＋ Agregar botón
      </button>
    </Card>
  );
}

export function SecDiseno({ draft, edit, notify }: SectionProps) {
  const setData = useSetData(edit);
  const t = draft.data.tema;
  const setTema = (patch: Partial<typeof t>) => setData((d) => ({ ...d, tema: { ...d.tema, ...patch } }));
  return (
    <Card title="Diseño" sub="Colores y estilo de la página. La tipografía es Archivo.">
      <FieldBox label="Paletas rápidas">
        <div className="flex flex-wrap gap-2">
          {PALETAS.map((p) => (
            <button
              key={p.n} type="button" title={p.n} aria-label={`Paleta ${p.n}`}
              onClick={() => setTema({ colorPrincipal: p.p, fondo: p.bg, texto: p.tx })}
              style={{ background: `linear-gradient(135deg, ${p.p} 50%, ${p.bg} 50%)` }}
              className="size-10 rounded-full border-2 border-white shadow-[0_0_0_1px_#c4c9d2] transition hover:scale-110"
            />
          ))}
        </div>
      </FieldBox>
      <div className="mb-3.5 grid gap-3.5 sm:grid-cols-3">
        <ColorField label="Color principal" value={t.colorPrincipal} onChange={(v) => setTema({ colorPrincipal: v })} />
        <ColorField label="Fondo" value={t.fondo} onChange={(v) => setTema({ fondo: v })} />
        <ColorField label="Texto" value={t.texto} onChange={(v) => setTema({ texto: v })} />
      </div>
      <BgImageField value={t.imagenFondo} onChange={(v) => setTema({ imagenFondo: v })} notify={notify} />
      <Seg<BtnStyle>
        label="Estilo de botones" value={t.estiloBoton} onChange={(v) => setTema({ estiloBoton: v })}
        options={[['solido', 'Sólido'], ['sombra', 'Con sombra'], ['borde', 'Solo borde']]}
      />
      <Seg<Shape>
        label="Forma de los botones" value={t.forma} onChange={(v) => setTema({ forma: v })}
        options={[['redondeado', 'Redondeado'], ['pill', 'Píldora'], ['recto', 'Recto']]}
      />
    </Card>
  );
}
