import React from "react";
import { Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { canManageSaves } from "../../lib/accessControl";

interface HeaderProps {
  pageTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle: _pageTitle }) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const handleViewSaves = () => {
    navigate("/saves");
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

      <div className="mr-2 mt-0.5 flex items-center gap-4">
        {canManageSaves(role) ? (
          <button
            type="button"
            onClick={handleViewSaves}
            className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
          >
            <Save className="mt-[1px] h-5 w-4" />
            <span>View Saves</span>
          </button>
        ) : null}
      </div>
    </header>
  );
};