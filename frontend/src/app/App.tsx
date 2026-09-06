import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';

import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';
import { ResourceDetailPage } from '@/features/catalog/pages/ResourceDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { UnauthorizedScreen } from '@/features/auth/components/UnauthorizedScreen';
import { MyReservationsPage } from '@/features/lifecycle/pages/MyReservationsPage';
import { ReceptionPage } from '@/features/lifecycle/pages/ReceptionPage';
import { MembershipPage } from '@/features/membership/pages/MembershipPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas de Catálogo y Autenticación */}
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/resource/:resourceId" element={<ResourceDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedScreen />} />

            {/* Rutas Protegidas de Miembro */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['MEMBER']}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reservations"
              element={
                <ProtectedRoute allowedRoles={['MEMBER']}>
                  <MyReservationsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/membership"
              element={
                <ProtectedRoute allowedRoles={['MEMBER']}>
                  <MembershipPage />
                </ProtectedRoute>
              }
            />

            {/* Rutas Protegidas de Operaciones / Admin */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['SITE_ADMIN', 'RECEPTIONIST']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/checkin"
              element={
                <ProtectedRoute allowedRoles={['SITE_ADMIN', 'RECEPTIONIST']}>
                  <ReceptionPage />
                </ProtectedRoute>
              }
            />

            {/* Redirección por defecto */}
            <Route path="/" element={<Navigate to="/catalog" replace />} />
            <Route path="*" element={<Navigate to="/catalog" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};
