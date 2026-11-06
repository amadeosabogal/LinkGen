import type { ReactNode } from 'react';

export const inputCls =
  'w-full rounded-[10px] border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-600 focus:ring-3 focus:ring-indigo-600/20';
const btnBase =
  'inline-flex items-center justify-center gap-1.5 rounded-[10px] border px-4 py-2.5 font-semibold whitespace-nowrap no-underline disabled:cursor-not-allowed disabled:opacity-45';
export const btnPrimary = `${btnBase} border-transparent bg-indigo-600 text-white hover:enabled:bg-indigo-700`;
export const btnGhost = `${btnBase} border-slate-200 bg-white text-slate-900 hover:enabled:bg-slate-100`;

export function Card({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-[14px] border border-slate-200 bg-white p-5">
      <h3 className="text-base font-bold">{title}</h3>
      {sub && <p className="mt-1 mb-3.5 text-[13.5px] text-slate-500">{sub}</p>}
      <div className={sub ? '' : 'mt-3.5'}>{children}</div>
    </section>
  );
}

const Label = ({ children }: { children: ReactNode }) => <span className="text-[13px] font-semibold">{children}</span>;
const Hint = ({ children }: { children?: ReactNode }) =>
  children ? <small className="text-[12.5px] text-slate-500">{children}</small> : null;

/** Contenedor de campo que NO es <label> (para controles con varios botones). */
export function FieldBox({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-3.5 grid gap-1.5 last:mb-0">
      <Label>{label}</Label>
      {children}
      <Hint>{hint}</Hint>
    </div>
  );
}

interface TextProps {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string; type?: string; max?: number;
}
export function TextField({ label, value, onChange, placeholder, hint, type = 'text', max }: TextProps) {
  return (
    <label className="mb-3.5 grid gap-1.5 last:mb-0">
      <Label>{label}</Label>
      <input
        type={type} value={value} placeholder={placeholder} maxLength={max} autoComplete="off"
        onChange={(e) => onChange(e.target.value)} className={inputCls}
      />
      <Hint>{hint}</Hint>
    </label>
  );
}

export function AreaField({ label, value, onChange, placeholder, hint }: Omit<TextProps, 'type' | 'max'>) {
  return (
    <label className="mb-3.5 grid gap-1.5 last:mb-0">
      <Label>{label}</Label>
      <textarea
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} min-h-28 resize-y leading-normal`}
      />
      <Hint>{hint}</Hint>
    </label>
  );
}

export function SelectField({ label, value, onChange, options, srOnly }: {
  label: string; value: string; onChange: (v: string) => void; options: [string, string][]; srOnly?: boolean;
}) {
  return (
    <label className="grid gap-1.5">
      <span className={srOnly ? 'sr-only' : 'text-[13px] font-semibold'}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
    </label>
  );
}

export function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <FieldBox label={label}>
      <div className="flex items-center gap-2.5">
        <input
          type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}
          className="h-[38px] w-11 rounded-lg border border-slate-300 bg-white p-0.5"
        />
        <code className="font-mono text-[12.5px]">{value}</code>
      </div>
    </FieldBox>
  );
}

export function Seg<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: [T, string][]; onChange: (v: T) => void;
}) {
  return (
    <FieldBox label={label}>
      <div role="group" aria-label={label} className="inline-flex flex-wrap overflow-hidden rounded-[10px] border border-slate-300 bg-white">
        {options.map(([v, t]) => (
          <button
            key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
            className="border-r border-slate-300 px-3.5 py-2 font-medium last:border-r-0 aria-pressed:bg-indigo-600 aria-pressed:text-white"
          >
            {t}
          </button>
        ))}
      </div>
    </FieldBox>
  );
}

export function IconBtn({ children, title, onClick, disabled }: {
  children: ReactNode; title: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}
      className="size-8 rounded-lg border border-slate-200 bg-white leading-none hover:enabled:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
