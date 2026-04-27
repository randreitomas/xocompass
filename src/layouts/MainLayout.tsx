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
          className={`flex min-w-0 flex-1 flex-col transition-all duration-200 ${
            isSidebarCollapsed ? "pl-20" : "pl-64"
          }`}
        >
          <Header pageTitle={pageTitle} />
          <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto bg-gray-50 p-8">
            <div className="flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col self-stretch [&>*]:w-full [&>*]:min-w-0 [&>*]:max-w-none [&>*]:self-stretch">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

