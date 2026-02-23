import React from "react";
import { Outlet } from "react-router-dom";
import { Header } from "../components/layout/Header";
import { Sidebar } from "../components/layout/Sidebar";

interface MainLayoutProps {
  pageTitle?: string;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ pageTitle }) => {
  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-50 text-slate-900">
      <div className="flex h-full">
        <Sidebar />

        <div className="ml-64 flex flex-1 flex-col">
          <Header pageTitle={pageTitle} />
          <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

