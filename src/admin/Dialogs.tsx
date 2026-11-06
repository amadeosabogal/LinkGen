import { useEffect, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';
import { PRESETS } from '../lib/presets';
import { btnGhost, btnPrimary } from './fields';

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
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
      className="m-auto w-[min(94vw,520px)] rounded-[18px] border-0 p-6 text-slate-900 shadow-2xl backdrop:bg-slate-900/55"
    >
      {children}
    </dialog>
  );
}

export function RubroDialog({ onPick, onClose }: { onPick: (key: string) => void; onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold">¿De qué rubro es el negocio?</h2>
      <p className="mt-1 text-[13.5px] text-slate-500">Cargo una plantilla con textos y diseño de ejemplo. Después cambias lo que quieras.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {Object.entries(PRESETS).map(([key, p]) => (
          <button
            key={key} type="button" onClick={() => onPick(key)}
            className="grid justify-items-start gap-1 rounded-[14px] border border-slate-200 bg-white p-4 text-left hover:border-indigo-600 hover:bg-indigo-50"
          >
            <span className="text-[28px] leading-none">{p.emoji}</span>
            <strong>{p.etiqueta}</strong>
          </button>
        ))}
      </div>
      <div className="mt-5 flex justify-end">
        <button type="button" className={btnGhost} onClick={onClose}>Cancelar</button>
      </div>
    </Modal>
  );
}

export function DoneDialog({ link, slug, isLocal, onCopy, onClose }: {
  link: string; slug: string; isLocal: boolean; onCopy: (text: string) => void; onClose: () => void;
}) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(link, { width: 480, margin: 2 }).then((u) => alive && setQr(u)).catch(() => {});
    return () => { alive = false; };
  }, [link]);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold">✅ ¡Link publicado!</h2>
      <p className="mt-1 text-[13.5px] text-slate-500">Ya está en línea. Copia este link y pásaselo a tu cliente para sus redes sociales.</p>
      <div className="mt-4 flex gap-2">
        <input
          readOnly value={link} aria-label="Link publicado"
          className="min-w-0 flex-1 rounded-[10px] border border-slate-300 bg-slate-50 px-3 py-2.5 font-mono text-[13px]"
        />
        <button type="button" className={btnPrimary} onClick={() => onCopy(link)}>Copiar</button>
      </div>
      {isLocal && (
        <p className="mt-3.5 rounded-[10px] bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
          Estás en modo prueba: este link solo abre en este navegador. Para que funcione para todo el mundo, conecta la API con tu base de datos (mira LEEME.md).
        </p>
      )}
      {qr && (
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-slate-200 p-3.5">
          <img src={qr} alt="Código QR del link" className="size-[120px] rounded-md" />
          <div>
            <a href={qr} download={`${slug}-qr.png`} className={btnGhost}>Descargar QR</a>
            <p className="mt-1 text-[13px] text-slate-500">Para imprimir en el local.</p>
          </div>
        </div>
      )}
      <div className="mt-5 flex justify-end gap-2.5">
        <a href={link} target="_blank" rel="noopener noreferrer" className={btnGhost}>Abrir página</a>
        <button type="button" className={btnPrimary} onClick={onClose}>Listo</button>
      </div>
    </Modal>
  );
}
