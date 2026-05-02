import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  HelpCircle,
  Database,
  ShieldCheck,
  User,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import sidebarLogoSrc from "../../assets/xocompass-logo.png";
import { useAuth } from "../../contexts/AuthContext";
import { canManageSaves } from "../../lib/accessControl";

const navItemBase = "flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const navItemInactive = "text-slate-300 hover:bg-white/10 hover:text-white";
const navItemActive = "bg-white/10 text-white";
interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { user, role, logout } = useAuth();
  const isAdmin = role === "ADMIN";
  const canAccessSaves = canManageSaves(role);
  const profileEmail = user?.email ?? "";
  const profileName = user?.full_name ?? "User";

  const handleLogout = () => {
    localStorage.removeItem("xocompass:selectedModelId");
    localStorage.removeItem("xocompass:selectedModelVersion");
    void logout();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-20 flex flex-col border-r border-white/10 bg-[#141316] transition-all duration-200 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      <div className={`flex h-16 items-center border-b border-white/10 ${isCollapsed ? "px-3" : "px-4"}`}>
        <div className={`flex w-full ${isCollapsed ? "justify-center" : "items-center gap-2"}`}>
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2"}`}>
            <img
              src={sidebarLogoSrc}
              alt="XoCompass logo"
              className="h-8 w-8 rounded-xl object-cover"
            />
            {!isCollapsed && (
              <div className="flex items-center">
                <span className="text-base font-semibold leading-none tracking-tight text-white">
                  XoCompass
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className={`flex-1 space-y-1 py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        {!isCollapsed && (
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Main Menu
          </p>
        )}

        <NavLink
          to="/business-analytics"
          className={({ isActive }) =>
            `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
          }
          title="Business Analytics"
        >
          <LayoutDashboard size={16} />
          {!isCollapsed && <span>Business Analytics</span>}
        </NavLink>

        <NavLink
          to="/forecast-actions"
          className={({ isActive }) =>
            `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
          }
          title="Forecast & Actions"
        >
          <TrendingUp size={16} />
          {!isCollapsed && <span>Forecast & Actions</span>}
        </NavLink>

        <NavLink
          to="/advanced"
          className={({ isActive }) =>
            `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
          }
          title="Advanced Metrics"
        >
          <LineChart size={16} />
          {!isCollapsed && <span>Advanced Metrics</span>}
        </NavLink>

        {canAccessSaves && (
          <NavLink
            to="/saves"
            className={({ isActive }) =>
              `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
            }
            title="Saves"
          >
            <Database size={16} />
            {!isCollapsed && <span>Saves</span>}
          </NavLink>
        )}

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

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `${navItemBase} ${isCollapsed ? "justify-center gap-0 px-2" : "gap-3"} ${isActive ? navItemActive : navItemInactive}`
            }
            title="Admin Console"
          >
            <ShieldCheck size={16} />
            {!isCollapsed && <span>Admin Console</span>}
          </NavLink>
        )}
      </nav>

      <div className={`${isCollapsed ? "px-2" : "px-4"} pb-2`}>
        <button
          type="button"
          onClick={onToggle}
          className={`inline-flex items-center gap-2 text-slate-300 transition hover:bg-white/10 hover:text-white ${
            isCollapsed
              ? "h-8 w-full justify-center rounded-full"
              : "h-9 w-full justify-start rounded-lg px-3"
          }`}
          title={isCollapsed ? "Expand menu" : "Collapse menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4 shrink-0" />
          )}
          {!isCollapsed && <span className="text-sm font-medium">Collapse Menu</span>}
        </button>
      </div>

      <div className={`border-t border-white/10 py-4 ${isCollapsed ? "px-2" : "px-4"}`}>
        {!isCollapsed && (
          <p className="mb-3 px-1 text-[10px] leading-snug text-slate-500">
            Role updates from your admin can take up to 15 minutes to apply. Refresh if a menu or action still looks unavailable.
          </p>
        )}
        <div className={`rounded-lg p-2 ${isCollapsed ? "flex justify-center" : "flex items-center gap-3"} hover:bg-white/5`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600/10">
            <User className="h-5 w-5 text-teal-600" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white">{profileName}</span>
              <span className="text-sm text-slate-500">
                {profileEmail}
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

