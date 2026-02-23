import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  LineChart,
  FlaskConical,
  HelpCircle,
  User,
} from "lucide-react";

const navItemBase =
  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
const navItemInactive = "text-slate-600 hover:bg-teal-50 hover:text-teal-700";
const navItemActive = "bg-teal-50 text-teal-700";

export const Sidebar: React.FC = () => {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-600 text-white font-semibold">
            XO
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight">
              XoCompass
            </span>
<span className="text-sm text-slate-500">
          </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-4">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Navigation
        </p>

        <NavLink
          to="/simplified"
          className={({ isActive }) =>
            `${navItemBase} ${isActive ? navItemActive : navItemInactive}`
          }
        >
          <LayoutDashboard size={16} />
          <span>Simplified Metrics</span>
        </NavLink>

        <NavLink
          to="/advanced"
          className={({ isActive }) =>
            `${navItemBase} ${isActive ? navItemActive : navItemInactive}`
          }
        >
          <LineChart size={16} />
          <span>Advanced Metrics</span>
        </NavLink>

        <NavLink
          to="/model-lab"
          className={({ isActive }) =>
            `${navItemBase} ${isActive ? navItemActive : navItemInactive}`
          }
        >
          <FlaskConical size={16} />
          <span>Time Series Model Lab</span>
        </NavLink>

        <NavLink
          to="/faqs"
          className={({ isActive }) =>
            `${navItemBase} ${isActive ? navItemActive : navItemInactive}`
          }
        >
          <HelpCircle size={16} />
          <span>FAQs</span>
        </NavLink>
      </nav>

      <div className="border-t px-4 py-4">
        <div className="flex items-center gap-3 rounded-lg p-2 hover:bg-slate-50">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-600/10">
            <User className="h-5 w-5 text-teal-600" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Admin</span>
            <span className="text-sm text-slate-500">
              admin@xocompass.com
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
};

