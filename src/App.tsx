import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { MainLayout } from "./layouts/MainLayout";
import { SimplifiedMetrics } from "./pages/SimplifiedMetrics";
import { AdvancedMetrics } from "./pages/AdvancedMetrics";
import { TimeSeriesModelLab } from "./pages/TimeSeriesModelLab";
import { FaqsPage } from "./pages/FaqsPage";
import { LoginPage } from "./pages/LoginPage";

const App: React.FC = () => {
  return (
    <Routes>
      {/* Login does NOT use MainLayout */}
      <Route path="/login" element={<LoginPage />} />

      {/* Default route goes to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* All authenticated dashboard views use MainLayout */}
      <Route
        element={<MainLayout pageTitle="Business Analytics Dashboard" />}
      >
        <Route path="/simplified" element={<SimplifiedMetrics />} />
        <Route path="/advanced" element={<AdvancedMetrics />} />
        <Route path="/model-lab" element={<TimeSeriesModelLab />} />
        <Route path="/faqs" element={<FaqsPage />} />
      </Route>
    </Routes>
  );
};

export default App;

