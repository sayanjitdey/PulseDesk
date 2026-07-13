// apps/web/src/App.tsx  — replace with full routing
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage }    from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';

// Placeholder pages (Week 2 builds these properly)
const TicketsPage   = () => (
  <div className="p-8">
    <h1 className="text-xl font-semibold text-gray-900">Tickets</h1>
    <p className="mt-2 text-gray-500">Coming in Week 2 — ticket list goes here.</p>
  </div>
);
const DashboardPage = () => (
  <div className="p-8">
    <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
    <p className="mt-2 text-gray-500">Coming in Week 4 — analytics go here.</p>
  </div>
);
const SettingsPage  = () => (
  <div className="p-8">
    <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
  </div>
);

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/tickets" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tickets"   element={<TicketsPage />} />
          <Route path="settings"  element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}