import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { BusinessAnalyticsPage } from "./pages/BusinessAnalyticsPage";
import { ForecastActions } from "./pages/ForecastActions";
import { AdvancedMetrics } from "./pages/AdvancedMetrics";
import { FaqsPage } from "./pages/FaqsPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SavesPage } from "./pages/SavesPage";
import { AdminPage } from "./pages/AdminPage";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/saves" element={
        <ProtectedRoute requiredRole="ANALYST">
          <SavesPage />
        </ProtectedRoute>
      } />

      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout pageTitle="Business Analytics Dashboard" />
          </ProtectedRoute>
        }
      >
        <Route path="/business-analytics" element={<BusinessAnalyticsPage />} />
        <Route path="/forecast-actions" element={<ForecastActions />} />
        <Route path="/advanced" element={<AdvancedMetrics />} />
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="ADMIN">
            <AdminPage />
          </ProtectedRoute>
        } />
        <Route path="/faqs" element={<FaqsPage />} />
      </Route>
    </Routes>
  );
};

export default App;
