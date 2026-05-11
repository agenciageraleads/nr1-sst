/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CompaniesPage from './pages/CompaniesPage';
import CampaignsPage from './pages/CampaignsPage';
import ResultsPage from './pages/ResultsPage';
import ReportPage from './pages/ReportPage';
import ReportsListPage from './pages/ReportsListPage';
import SettingsPage from './pages/SettingsPage';
import CompanyForm from './pages/CompanyForm';
import EmployeeForm from './pages/EmployeeForm';
import MainLayout from './components/layout/MainLayout';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthorized, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!user || !isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/formulario/empresa/:token" element={<CompanyForm />} />
        <Route path="/formulario/colaborador/:token" element={<EmployeeForm />} />

        {/* Protected Admin Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Dashboard />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/empresas"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CompaniesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campanhas"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CampaignsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campanhas/:id/resultados"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ResultsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/campanhas/:id/relatorio"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/relatorios"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ReportsListPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuracoes"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SettingsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
