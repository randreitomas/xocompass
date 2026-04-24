import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  LineChart,
  HelpCircle,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";

const navItemBase = "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const navItemInactive = "text-slate-600 hover:bg-teal-50 hover:text-teal-700";
const navItemActive = "bg-teal-50 text-teal-700";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("xocompass:selectedModelId");
    localStorage.removeItem("xocompass:selectedModelVersion");
    navigate("/login");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r bg-white transition-all duration-200 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`flex h-16 items-center border-b ${isCollapsed ? "px-3" : "px-4"}`}>
        <div className="flex w-full items-center justify-between">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white font-semibold">
              XO
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight">
                  XoCompass
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <nav className={`flex-1 space-y-1 py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        {!isCollapsed && (
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Navigation
          </p>
        )}

        <NavLink
          to="/simplified"
          className={({ isActive }) =>
            `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
          }
          title="Business Analytics"
        >
          <LayoutDashboard size={16} />
          {!isCollapsed && <span>Business Analytics</span>}
        </NavLink>

        <NavLink
          to="/advanced"
          className={({ isActive }) =>
            `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
          }
          title="Advanced Analytics"
        >
          <LineChart size={16} />
          {!isCollapsed && <span>Advanced Analytics</span>}
        </NavLink>

        <NavLink
          to="/faqs"
          className={({ isActive }) =>
            `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
          }
          title="FAQs"
        >
          <HelpCircle size={16} />
          {!isCollapsed && <span>FAQs</span>}
        </NavLink>
      </nav>

      <div className={`border-t py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        <div className={`rounded-lg p-2 ${isCollapsed ? "flex justify-center" : "flex items-center gap-3"} hover:bg-slate-50`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600/10">
            <User className="h-5 w-5 text-teal-600" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">Admin</span>
              <span className="text-sm text-slate-500">
                admin@xocompass.com
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

