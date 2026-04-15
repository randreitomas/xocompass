import React from "react";
import { LogOut, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle }) => {
  const navigate = useNavigate();

  const handleViewSaves = () => {
    navigate("/saves");
  };

  const handleExitSave = () => {
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-shrink-0 items-center justify-between border-b bg-white px-8">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            KJS International Travel and Tours
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
          File: KJS_POS_Data_2023-2025.csv (Processed Feb 14, 2026)
        </span>

        <button
          onClick={handleViewSaves}
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <Save className="h-4 w-4" />
          <span>View Saves</span>
        </button>

        <button
          onClick={handleExitSave}
          className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
        >
          <LogOut className="h-4 w-4" />
          <span>Exit Save</span>
        </button>
      </div>
    </header>
  );
};