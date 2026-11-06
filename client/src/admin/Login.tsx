import { useState, type FormEvent } from 'react';
import { Store, type User } from '../lib/store';
import { btnPrimary, inputCls } from './fields';
import { errMsg } from './editorState';

export default function Login({ onDone }: { onDone: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      await Store.signIn(email.trim(), pass);
      const u = await Store.user();
      if (u) onDone(u);
    } catch (ex) {
      setErr('No pude entrar: ' + (errMsg(ex) || 'revisa tu correo y contraseña.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-5">
      <form onSubmit={submit} className="w-[min(100%,380px)] rounded-[14px] border border-slate-200 bg-white p-7">
        <h1 className="text-[26px] font-extrabold">LinkGen</h1>
        <p className="mt-1 mb-4 text-[13.5px] text-slate-500">Entra para generar los links de tus clientes.</p>
        <label className="mb-3.5 grid gap-1.5">
          <span className="text-[13px] font-semibold">Correo</span>
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </label>
        <label className="mb-3.5 grid gap-1.5">
          <span className="text-[13px] font-semibold">Contraseña</span>
          <input type="password" required autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} className={inputCls} />
        </label>
        {err && <p role="alert" className="mb-3.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-900">{err}</p>}
        <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  );
}
