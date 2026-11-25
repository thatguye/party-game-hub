import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HubHome } from '@/components/HubHome';

const ChooserGame = lazy(() => import('@/games/chooser/ChooserGame'));
const ImpostorGame = lazy(() => import('@/games/impostor/ImpostorGame'));
const FindersKeepersGame = lazy(() => import('@/games/finders-keepers/FindersKeepersGame'));

function RouteLoader() {
  return (
    <div className="min-h-[100dvh] bg-[#0B0917] flex items-center justify-center">
      <div className="h-9 w-9 rounded-full border-2 border-fuchsia-400/30 border-t-fuchsia-400 animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<HubHome />} />
        <Route path="/chooser" element={<ChooserGame />} />
        <Route path="/impostor" element={<ImpostorGame />} />
        <Route path="/finders-keepers" element={<FindersKeepersGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
