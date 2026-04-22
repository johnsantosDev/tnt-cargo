import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import DashboardLayout from './components/layout/DashboardLayout';
import { Toaster } from 'react-hot-toast';
import './i18n';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ShipmentsPage = lazy(() => import('./pages/ShipmentsPage'));
const ShipmentDetailPage = lazy(() => import('./pages/ShipmentDetailPage'));
const ClientsPage = lazy(() => import('./pages/ClientsPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const PaymentDetailPage = lazy(() => import('./pages/PaymentDetailPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const CashAdvancesPage = lazy(() => import('./pages/CashAdvancesPage'));
const InvoicesPage = lazy(() => import('./pages/InvoicesPage'));
const FlightTicketsPage = lazy(() => import('./pages/FlightTicketsPage'));
const PackingListsPage = lazy(() => import('./pages/PackingListsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const CurrencyPage = lazy(() => import('./pages/CurrencyPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const TrackingPage = lazy(() => import('./pages/TrackingPage'));
const TransfersPage = lazy(() => import('./pages/TransfersPage'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/dashboard/login" replace />;
  return <Outlet />;
}

function GuestRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/tracking/:trackingNumber" element={<TrackingPage />} />
          <Route path="/t/:shareToken" element={<TrackingPage />} />

          {/* Guest only */}
          <Route element={<GuestRoute />}>
            <Route path="/dashboard/login" element={<LoginPage />} />
          </Route>

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="shipments" element={<ShipmentsPage />} />
              <Route path="shipments/:id" element={<ShipmentDetailPage />} />
              <Route path="clients" element={<ClientsPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="payments/:id" element={<PaymentDetailPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="cash-advances" element={<CashAdvancesPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="flight-tickets" element={<FlightTicketsPage />} />
              <Route path="packing-lists" element={<PackingListsPage />} />                <Route path="transfers" element={<TransfersPage />} />              <Route path="reports" element={<ReportsPage />} />
              <Route path="currency" element={<CurrencyPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="search" element={<SearchPage />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { fontSize: '14px' } }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
