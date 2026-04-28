import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";

interface MainLayoutProps {
  pageTitle?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ pageTitle }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 text-slate-900">
      <div className="flex h-full">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
        />

        <div
          className={`flex flex-1 min-w-0 flex-col transition-all duration-200 ${
            isSidebarCollapsed ? "ml-20" : "ml-64"
          }`}
        >
          <Header pageTitle={pageTitle} />
          <main className="flex-1 min-w-0 overflow-auto bg-gray-50 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

