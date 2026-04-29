import React, { useMemo, useState } from "react";
import { Download, Plus, RefreshCw, ShieldCheck } from "lucide-react";

type SectionId = "users" | "overview" | "audit" | "config";
type UserRole = "Admin" | "Analyst" | "Viewer";
type UserStatus = "Active" | "Inactive";
type ActionType = "Login" | "Export" | "Forecast Run" | "Settings Change";
type ActionStatus = "Success" | "Failed";

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  lastLogin: string;
}

interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  actionType: ActionType;
  module: string;
  status: ActionStatus;
}

interface ModuleConfig {
  id: string;
  name: string;
  visibility: Record<UserRole, boolean>;
}

const SECTION_TABS: Array<{ id: SectionId; label: string }> = [
  { id: "users", label: "User & Access Management" },
  { id: "overview", label: "System Overview" },
  { id: "audit", label: "Audit Logs & Activity Monitoring" },
  { id: "config", label: "Report & Module Configuration" },
];

const INITIAL_USERS: StaffUser[] = [
  { id: "u1", name: "Maria Santos", email: "maria.santos@kjs.com", role: "Admin", status: "Active", lastLogin: "Apr 29, 2026 08:05 PM" },
  { id: "u2", name: "Ramon Flores", email: "ramon.flores@kjs.com", role: "Analyst", status: "Active", lastLogin: "Apr 29, 2026 07:51 PM" },
  { id: "u3", name: "Liza Gomez", email: "liza.gomez@kjs.com", role: "Viewer", status: "Active", lastLogin: "Apr 29, 2026 06:13 PM" },
  { id: "u4", name: "Ken Dela Cruz", email: "ken.delacruz@kjs.com", role: "Analyst", status: "Inactive", lastLogin: "Apr 26, 2026 10:04 AM" },
];

const RECENT_EVENTS = [
  "Admin login: Maria Santos",
  "SARIMAX sync completed",
  "Forecast run generated for model v10.1",
  "Role updated: Viewer -> Analyst",
  "Exported Forecast & Actions report",
  "Failed login attempt blocked",
  "Manual sync triggered by analyst",
  "Advanced Metrics viewed by manager",
  "User invitation sent to new analyst",
  "Settings change: KPI alert threshold",
];

const INITIAL_LOGS: AuditLogEntry[] = Array.from({ length: 24 }, (_, i) => ({
  id: `log-${i + 1}`,
  timestamp: `2026-04-${String(29 - Math.floor(i / 4)).padStart(2, "0")} ${String(8 + (i % 6)).padStart(2, "0")}:1${i % 10}`,
  user: i % 3 === 0 ? "Maria Santos" : i % 3 === 1 ? "Ramon Flores" : "Liza Gomez",
  actionType: (["Login", "Export", "Forecast Run", "Settings Change"] as ActionType[])[i % 4],
  module: i % 2 === 0 ? "Forecast & Actions" : "Advanced Metrics",
  status: i % 7 === 0 ? "Failed" : "Success",
}));

const INITIAL_MODULES: ModuleConfig[] = [
  { id: "m1", name: "Business Analytics Dashboard", visibility: { Admin: true, Analyst: true, Viewer: true } },
  { id: "m2", name: "Forecast & Actions", visibility: { Admin: true, Analyst: true, Viewer: true } },
  { id: "m3", name: "Advanced Metrics", visibility: { Admin: true, Analyst: true, Viewer: false } },
  { id: "m4", name: "Admin Console", visibility: { Admin: true, Analyst: false, Viewer: false } },
];

export const AdminPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>("users");
  const [users, setUsers] = useState<StaffUser[]>(INITIAL_USERS);
  const [logs] = useState<AuditLogEntry[]>(INITIAL_LOGS);
  const [modules, setModules] = useState<ModuleConfig[]>(INITIAL_MODULES);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "Viewer" as UserRole });
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterUser, setFilterUser] = useState("All");
  const [filterAction, setFilterAction] = useState<"All" | ActionType>("All");
  const [logPage, setLogPage] = useState(1);
  const [forecastThreshold, setForecastThreshold] = useState("12");
  const [bookingBenchmark, setBookingBenchmark] = useState("2500");
  const [defaultDateRange, setDefaultDateRange] = useState("Last 90 Days");

  const pipelineHealthy = true;
  const filteredLogs = useMemo(() => {
    return logs.filter((entry) => {
      if (filterUser !== "All" && entry.user !== filterUser) return false;
      if (filterAction !== "All" && entry.actionType !== filterAction) return false;
      if (dateFrom && entry.timestamp < dateFrom) return false;
      if (dateTo && entry.timestamp > `${dateTo} 23:59`) return false;
      return true;
    });
  }, [logs, filterUser, filterAction, dateFrom, dateTo]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = filteredLogs.slice((logPage - 1) * pageSize, logPage * pageSize);

  const handleInviteUser = () => {
    if (!inviteForm.name || !inviteForm.email) return;
    setUsers((prev) => [
      {
        id: `u-${prev.length + 1}`,
        name: inviteForm.name,
        email: inviteForm.email,
        role: inviteForm.role,
        status: "Active",
        lastLogin: "Never",
      },
      ...prev,
    ]);
    setInviteForm({ name: "", email: "", role: "Viewer" });
    setShowInviteModal(false);
  };

  const toggleModuleVisibility = (moduleId: string, role: UserRole) => {
    setModules((prev) =>
      prev.map((module) =>
        module.id === moduleId
          ? { ...module, visibility: { ...module.visibility, [role]: !module.visibility[role] } }
          : module
      )
    );
  };

  const exportLogsCsv = () => {
    const headers = ["timestamp", "user", "actionType", "module", "status"];
    const rows = filteredLogs.map((entry) => [entry.timestamp, entry.user, entry.actionType, entry.module, entry.status]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "audit-logs.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Console</h1>
        <p className="mt-1 text-sm text-slate-600">Govern users, platform health, audit activity, and module controls.</p>
      </section>

      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
              activeSection === tab.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </section>

      {activeSection === "users" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">User & Access Management</h2>
            <button type="button" onClick={() => setShowInviteModal(true)} className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
              <Plus className="h-4 w-4" /> Invite User
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>{["Name", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{u.role}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${u.status === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{u.status}</span></td>
                    <td className="px-3 py-2">{u.lastLogin}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs">Edit Role</button>
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs">{u.status === "Active" ? "Deactivate" : "Activate"}</button>
                        <button className="rounded-md border border-slate-200 px-2 py-1 text-xs">Reset Password</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === "overview" && (
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Total Active Users</p><p className="mt-2 text-3xl font-semibold text-slate-900">{users.filter((u) => u.status === "Active").length}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Last Data Sync</p><p className="mt-2 text-lg font-semibold text-slate-900">Apr 29, 2026 07:48 PM</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Pipeline Status</p><p className={`mt-2 text-lg font-semibold ${pipelineHealthy ? "text-emerald-700" : "text-rose-700"}`}>{pipelineHealthy ? "Healthy" : "Error"}</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase text-slate-400">Pending Alerts</p><p className="mt-2 text-3xl font-semibold text-slate-900">3</p></div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-900">Recent Activity Feed</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">{RECENT_EVENTS.map((event) => <li key={event} className="rounded-lg bg-slate-50 px-3 py-2">{event}</li>)}</ul>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">SARIMAX Pipeline Sync</h3>
            <p className="mt-2 text-sm text-slate-600">Current state: <span className={`font-semibold ${pipelineHealthy ? "text-emerald-700" : "text-rose-700"}`}>{pipelineHealthy ? "Healthy" : "Error"}</span></p>
            <p className="mt-1 text-xs text-slate-500">Last sync duration: 2m 14s</p>
            <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              <RefreshCw className="h-4 w-4" /> Trigger Sync
            </button>
          </div>
        </section>
      )}

      {activeSection === "audit" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Audit Logs & Activity Monitoring</h2>
            <button type="button" onClick={exportLogsCsv} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              <Download className="h-4 w-4" /> Export CSV
            </button>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-4">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option>All</option>
              {Array.from(new Set(logs.map((log) => log.user))).map((user) => <option key={user}>{user}</option>)}
            </select>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value as "All" | ActionType)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="All">All actions</option>
              {(["Login", "Export", "Forecast Run", "Settings Change"] as ActionType[]).map((action) => <option key={action} value={action}>{action}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>{["Timestamp", "User", "Action Type", "Affected Module", "Status"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-3 py-2">{log.timestamp}</td>
                    <td className="px-3 py-2">{log.user}</td>
                    <td className="px-3 py-2">{log.actionType}</td>
                    <td className="px-3 py-2">{log.module}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.status === "Success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">Page {logPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button type="button" disabled={logPage === 1} onClick={() => setLogPage((p) => Math.max(1, p - 1))} className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50">Prev</button>
              <button type="button" disabled={logPage === totalPages} onClick={() => setLogPage((p) => Math.min(totalPages, p + 1))} className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50">Next</button>
            </div>
          </div>
        </section>
      )}

      {activeSection === "config" && (
        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Report & Module Configuration</h2>
            <p className="mt-1 text-sm text-slate-500">Toggle module visibility per role.</p>
            <div className="mt-4 space-y-3">
              {modules.map((module) => (
                <div key={module.id} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-800">{module.name}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-3">
                    {(["Admin", "Analyst", "Viewer"] as UserRole[]).map((role) => (
                      <label key={role} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700">
                        <span>{role}</span>
                        <input type="checkbox" checked={module.visibility[role]} onChange={() => toggleModuleVisibility(module.id, role)} />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Global KPI & Date Defaults</h3>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Forecast Deviation Alert Threshold (%)</span>
                <input value={forecastThreshold} onChange={(e) => setForecastThreshold(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Booking Volume Benchmark</span>
                <input value={bookingBenchmark} onChange={(e) => setBookingBenchmark(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Default Date Range</span>
                <select value={defaultDateRange} onChange={(e) => setDefaultDateRange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                  <option>Year to Date</option>
                  <option>Last 12 Months</option>
                </select>
              </label>
            </div>
            <button type="button" className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              <ShieldCheck className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </section>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Invite New User</h3>
            <div className="mt-4 space-y-3">
              <input placeholder="Name" value={inviteForm.name} onChange={(e) => setInviteForm((p) => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <input placeholder="Email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <select value={inviteForm.role} onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value as UserRole }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="Admin">Admin</option>
                <option value="Analyst">Analyst</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowInviteModal(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button>
              <button type="button" onClick={handleInviteUser} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white">Create User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

