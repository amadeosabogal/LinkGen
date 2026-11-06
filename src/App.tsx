import { lazy, Suspense } from 'react';
import Viewer from './components/Viewer';

// El panel se carga aparte: la página pública que ve la gente queda ligera.
const Admin = lazy(() => import('./admin/Admin'));

export default function App() {
  const isAdmin = location.pathname.replace(/\/+$/, '') === '/admin';
  if (!isAdmin) return <Viewer />;
  return (
    <Suspense fallback={<p className="p-8 text-slate-500">Cargando panel…</p>}>
      <Admin />
    </Suspense>
  );
}
