import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { BusinessAnalyticsPage } from "./pages/BusinessAnalyticsPage";
import { ForecastActions } from "./pages/ForecastActions";
import { AdvancedMetrics } from "./pages/AdvancedMetrics";
import { FaqsPage } from "./pages/FaqsPage";
import { LoginPage } from "./pages/LoginPage";
import { SavesPage } from "./pages/SavesPage";
import { AdminPage } from "./pages/AdminPage";
import { AppRole, getStoredRole, hasRoleAccess } from "./lib/accessControl";

const RoleProtectedRoute: React.FC<{
  allowedRoles: AppRole[];
  children: React.ReactElement;
}> = ({ allowedRoles, children }) => {
  const role = getStoredRole();
  if (!role) return <Navigate to="/login" replace />;
  return hasRoleAccess(allowedRoles) ? children : <Navigate to="/business-analytics" replace />;
};

const App: React.FC = () => {
  return (
    <Routes>
      {/* Login does NOT use MainLayout */}
      <Route path="/login" element={<LoginPage />} />
      <Route
          path="/saves"
        element={
          <RoleProtectedRoute allowedRoles={["Analyst"]}>
            <SavesPage />
          </RoleProtectedRoute>
        }
      />

      {/* Default route goes to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* All authenticated dashboard views use MainLayout */}
      <Route
        element={
          <RoleProtectedRoute allowedRoles={["Admin", "Manager", "Analyst", "Marketing"]}>
            <MainLayout pageTitle="Business Analytics Dashboard" />
          </RoleProtectedRoute>
        }
      >
        <Route path="/business-analytics" element={<BusinessAnalyticsPage />} />
        <Route path="/forecast-actions" element={<ForecastActions />} />
        <Route
          path="/advanced"
          element={
            <RoleProtectedRoute allowedRoles={["Admin", "Manager", "Analyst"]}>
              <AdvancedMetrics />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RoleProtectedRoute allowedRoles={["Admin"]}>
              <AdminPage />
            </RoleProtectedRoute>
          }
        />
        <Route path="/faqs" element={<FaqsPage />} />
      </Route>
    </Routes>
  );
};

export default App;

