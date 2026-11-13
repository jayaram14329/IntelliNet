import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DashboardLayout } from './layouts/DashboardLayout';

import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { TrafficExplorerPage } from './pages/TrafficExplorerPage';
import { IntrusionPage } from './pages/IntrusionPage';
import { CongestionPage } from './pages/CongestionPage';
import { DatasetsPage } from './pages/DatasetsPage';
import { ModelsPage } from './pages/ModelsPage';
import { AlertsPage } from './pages/AlertsPage';
import { NetworkMonitorPage } from './pages/NetworkMonitorPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<OverviewPage />} />
            <Route path="traffic" element={<TrafficExplorerPage />} />
            <Route path="intrusion" element={<IntrusionPage />} />
            <Route path="congestion" element={<CongestionPage />} />
            <Route path="datasets" element={<DatasetsPage />} />
            <Route path="models" element={<ModelsPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="network" element={<NetworkMonitorPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
