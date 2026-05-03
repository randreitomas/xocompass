import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, ShieldCheck } from "lucide-react";
import { formatApiErrorForUi } from "../lib/formatApiError";
import * as adminService from "../services/adminService";
import type { components } from "../types/api";
import { useAuth } from "../contexts/AuthContext";

type SectionId = "users" | "audit" | "config";
type UiUserRole = "Admin" | "Analyst" | "Viewer";

type AdminUserListItem = components["schemas"]["AdminUserListItem"];
type AuditLogItem = components["schemas"]["AuditLogItem"];
type SystemOverviewResponse = components["schemas"]["SystemOverviewResponse"];
type PipelineStatusResponse = components["schemas"]["PipelineStatusResponse"];
type CreateInvitationResponse = components["schemas"]["CreateInvitationResponse"];
type AdminInitiateResetResponse = components["schemas"]["AdminInitiateResetResponse"];

interface ModuleConfig {
  id: string;
  name: string;
  visibility: Record<UiUserRole, boolean>;
}

const SECTION_TABS: Array<{ id: SectionId; label: string }> = [
  { id: "users", label: "User & Access Management" },
  { id: "audit", label: "Activity & Audit Logs" },
  { id: "config", label: "Report & Module Configuration" },
];

const INITIAL_MODULES: ModuleConfig[] = [
  { id: "m1", name: "Business Analytics Dashboard", visibility: { Admin: true, Analyst: true, Viewer: true } },
  { id: "m2", name: "Forecast & Actions", visibility: { Admin: true, Analyst: true, Viewer: true } },
  { id: "m3", name: "Advanced Metrics", visibility: { Admin: true, Analyst: true, Viewer: false } },
  { id: "m4", name: "Admin Console", visibility: { Admin: true, Analyst: false, Viewer: false } },
];

function uiRoleToApi(role: UiUserRole): components["schemas"]["CreateInvitationRequest"]["role"] {
  if (role === "Admin") return "ADMIN";
  if (role === "Analyst") return "ANALYST";
  return "VIEWER";
}

function apiRoleLabel(role: AdminUserListItem["role"]): string {
  switch (role) {
    case "ADMIN":
      return "ADMIN";
    case "ANALYST":
      return "ANALYST";
    case "VIEWER":
      return "VIEWER";
    default:
      return role;
  }
}

function apiRoleToUi(role: AdminUserListItem["role"]): UiUserRole {
  if (role === "ADMIN") return "Admin";
  if (role === "ANALYST") return "Analyst";
  return "Viewer";
}

function formatLogin(iso?: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "Never";
  }
}

function dateInputsToUtcIsoRange(from: string, to: string): {
  from_date?: string | null;
  to_date?: string | null;
} {
  const from_date = from ? `${from}T00:00:00.000Z` : null;
  const to_date = to ? `${to}T23:59:59.999Z` : null;
  return { from_date, to_date };
}

/** Soft-deleted rows anonymized by the backend often use this marker in name or email. */
const DELETED_USER_MARKER = "[deleted user]";

function isDeletedUserRow(u: AdminUserListItem): boolean {
  const name = (u.full_name ?? "").toLowerCase();
  const email = (u.email ?? "").toLowerCase();
  return (
    name.includes(DELETED_USER_MARKER) || email.includes(DELETED_USER_MARKER)
  );
}

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<SectionId>("users");

  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [showDeletedUsers, setShowDeletedUsers] = useState(false);

  const [overview, setOverview] = useState<SystemOverviewResponse | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatusResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  const [auditItems, setAuditItems] = useState<AuditLogItem[]>([]);
  const [auditCursor, setAuditCursor] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [actionTypes, setActionTypes] = useState<string[]>([]);
  const [moduleTypes, setModuleTypes] = useState<string[]>([]);

  const [modules] = useState<ModuleConfig[]>(INITIAL_MODULES);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "Viewer" as UiUserRole,
  });
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteUrlPayload, setInviteUrlPayload] = useState<CreateInvitationResponse | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  const [resetPayload, setResetPayload] = useState<AdminInitiateResetResponse | null>(
    null
  );
  const [resetCopied, setResetCopied] = useState(false);
  const [resetBusyId, setResetBusyId] = useState<string | null>(null);

  const [roleEditUser, setRoleEditUser] = useState<AdminUserListItem | null>(
    null
  );
  const [roleDraft, setRoleDraft] = useState<UiUserRole>("Viewer");
  const [roleEditBusy, setRoleEditBusy] = useState(false);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterUserId, setFilterUserId] = useState("All");
  const [filterAction, setFilterAction] = useState("All");
  const [filterModule, setFilterModule] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"All" | "SUCCESS" | "FAILED">("All");

  const [forecastThreshold, setForecastThreshold] = useState("12");
  const [bookingBenchmark, setBookingBenchmark] = useState("2500");
  const [defaultDateRange, setDefaultDateRange] = useState("Last 90 Days");
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError("");
    try {
      const res = await adminService.getUsers({ page: 1, page_size: 100 });
      setUsers(res.items);
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadOverviewBundle = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError("");
    try {
      const [ov, pipe] = await Promise.all([
        adminService.getSystemOverview(),
        adminService.getPipelineStatus(),
      ]);
      setOverview(ov);
      setPipeline(pipe);
    } catch (e) {
      setOverviewError(formatApiErrorForUi(e));
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadAuditVocab = useCallback(async () => {
    try {
      const v = await adminService.getAuditLogActionTypes();
      setActionTypes(v.action_types);
      setModuleTypes(v.modules);
    } catch {
      setActionTypes([]);
      setModuleTypes([]);
    }
  }, []);

  const fetchAuditPage = useCallback(
    async (cursor: string | null, replace: boolean) => {
      setAuditLoading(true);
      setAuditError("");
      const { from_date, to_date } = dateInputsToUtcIsoRange(dateFrom, dateTo);
      try {
        const page = await adminService.getAuditLogs({
          cursor,
          limit: 50,
          from_date,
          to_date,
          action_type: filterAction === "All" ? null : filterAction,
          module: filterModule === "All" ? null : filterModule,
          status: filterStatus === "All" ? null : filterStatus,
          user_id: filterUserId === "All" ? null : filterUserId,
        });
        setAuditItems((prev) =>
          replace ? page.items : [...prev, ...page.items]
        );
        setAuditCursor(page.next_cursor ?? null);
      } catch (e) {
        setAuditError(formatApiErrorForUi(e));
      } finally {
        setAuditLoading(false);
      }
    },
    [dateFrom, dateTo, filterAction, filterModule, filterStatus, filterUserId]
  );

  useEffect(() => {
    if (activeSection !== "users") return;
    void loadUsers();
  }, [activeSection, loadUsers]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    void loadOverviewBundle();
    const id = window.setInterval(() => {
      void loadOverviewBundle();
    }, 30000);
    return () => clearInterval(id);
  }, [activeSection, loadOverviewBundle]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    void loadAuditVocab();
  }, [activeSection, loadAuditVocab]);

  useEffect(() => {
    if (activeSection !== "audit") return;
    setAuditCursor(null);
    void fetchAuditPage(null, true);
  }, [activeSection, fetchAuditPage]);

  const userFilterOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const u of users) ids.add(u.id);
    return [...ids];
  }, [users]);

  const deletedUserCount = useMemo(
    () => users.filter(isDeletedUserRow).length,
    [users]
  );

  const visibleUsers = useMemo(() => {
    if (showDeletedUsers) return users;
    return users.filter((u) => !isDeletedUserRow(u));
  }, [users, showDeletedUsers]);

  const pipelineHealthy =
    overview?.pipeline_status === "healthy" ||
    pipeline?.last_status === "SUCCESS";

  const exportLogsCsv = () => {
    const headers = ["timestamp", "user_email", "action_type", "module", "status"];
    const rows = auditItems.map((entry) => [
      entry.timestamp,
      entry.user_email_snapshot ?? "",
      entry.action_type,
      entry.module,
      entry.status,
    ]);
    const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "audit-logs.csv");
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleActivate = async (userId: string) => {
    try {
      await adminService.activateUser(userId);
      await loadUsers();
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await adminService.deactivateUser(userId);
      await loadUsers();
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    }
  };

  const handleDeleteUser = async (u: AdminUserListItem) => {
    const ok = window.confirm(
      `Permanently remove access for ${u.email}? Their account will be soft-deleted (sessions revoked, email anonymized). This cannot be undone from the console.`
    );
    if (!ok) return;
    setUsersError("");
    try {
      await adminService.deleteUser(u.id);
      await loadUsers();
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    }
  };

  const openRoleEditor = (u: AdminUserListItem) => {
    setUsersError("");
    setRoleEditUser(u);
    setRoleDraft(apiRoleToUi(u.role));
  };

  const submitRoleEdit = async () => {
    if (!roleEditUser) return;
    setRoleEditBusy(true);
    setUsersError("");
    try {
      await adminService.patchUser(roleEditUser.id, {
        role: uiRoleToApi(roleDraft),
      });
      setRoleEditUser(null);
      await loadUsers();
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    } finally {
      setRoleEditBusy(false);
    }
  };

  const submitInvite = async () => {
    if (!inviteForm.email.trim()) return;
    setInviteBusy(true);
    try {
      const created = await adminService.createInvitation({
        email: inviteForm.email.trim(),
        role: uiRoleToApi(inviteForm.role),
      });
      setInviteUrlPayload(created);
      setInviteCopied(false);
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    } finally {
      setInviteBusy(false);
    }
  };

  const closeInviteFlow = () => {
    if (inviteUrlPayload && !inviteCopied) {
      const ok = window.confirm(
        "Dismiss without copying? This invite URL is shown only once and cannot be retrieved later."
      );
      if (!ok) return;
    }
    setShowInviteModal(false);
    setInviteForm({ email: "", role: "Viewer" });
    setInviteUrlPayload(null);
    setInviteCopied(false);
  };

  const copyInviteUrl = async () => {
    if (!inviteUrlPayload?.invite_url) return;
    try {
      await navigator.clipboard.writeText(inviteUrlPayload.invite_url);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  };

  const initiateAdminPasswordReset = async (u: AdminUserListItem) => {
    setUsersError("");
    setResetBusyId(u.id);
    try {
      const res = await adminService.initiateUserPasswordReset(u.id);
      setResetPayload(res);
      setResetCopied(false);
    } catch (e) {
      setUsersError(formatApiErrorForUi(e));
    } finally {
      setResetBusyId(null);
    }
  };

  const closeResetModal = () => {
    if (resetPayload && !resetCopied) {
      const ok = window.confirm(
        "Dismiss without copying? Share this reset link with the user out-of-band; it expires in about 30 minutes."
      );
      if (!ok) return;
    }
    setResetPayload(null);
    setResetCopied(false);
  };

  const copyResetUrl = async () => {
    if (!resetPayload?.reset_url) return;
    try {
      await navigator.clipboard.writeText(resetPayload.reset_url);
      setResetCopied(true);
    } catch {
      setResetCopied(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage("");
    try {
      const list = await adminService.listSettings();
      const keys = new Set(list.items.map((i) => i.key));
      const writes: Promise<unknown>[] = [];
      if (keys.has("forecast_deviation_alert_threshold_pct")) {
        writes.push(
          adminService.updateSetting(
            "forecast_deviation_alert_threshold_pct",
            Number(forecastThreshold)
          )
        );
      }
      if (keys.has("booking_volume_benchmark")) {
        writes.push(
          adminService.updateSetting(
            "booking_volume_benchmark",
            Number(bookingBenchmark)
          )
        );
      }
      if (keys.has("default_date_range_label")) {
        writes.push(
          adminService.updateSetting("default_date_range_label", defaultDateRange)
        );
      }
      if (writes.length === 0) {
        setConfigMessage(
          "No matching settings keys on the server; inputs kept locally only."
        );
      } else {
        await Promise.all(writes);
        setConfigMessage("Saved.");
      }
    } catch (e) {
      setConfigMessage(formatApiErrorForUi(e));
    } finally {
      setConfigSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Admin Console</h1>
        <p className="mt-1 text-sm text-slate-600">
          Govern users, monitor platform KPIs and audit trails together, and configure modules.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:grid-cols-3">
        {SECTION_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`w-full rounded-xl px-3 py-2.5 text-center text-sm font-semibold leading-snug transition ${
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
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={showDeletedUsers}
                  onChange={(e) => setShowDeletedUsers(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>
                  Show deleted users
                  {deletedUserCount > 0 ? (
                    <span className="text-slate-500"> ({deletedUserCount})</span>
                  ) : null}
                </span>
              </label>
              <button type="button" onClick={() => setShowInviteModal(true)} className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
                <Plus className="h-4 w-4" /> Invite User
              </button>
            </div>
          </div>
          {usersLoading ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent align-middle" />
              Loading users…
            </p>
          ) : null}
          {usersError ? (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{usersError}</p>
          ) : null}
          {!usersLoading &&
          users.length > 0 &&
          visibleUsers.length === 0 &&
          !showDeletedUsers ? (
            <p className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Every loaded account matches a deleted-user placeholder. Turn on{" "}
              <span className="font-medium text-slate-800">Show deleted users</span>{" "}
              to list them.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>{["Name", "Email", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="px-3 py-2">{u.full_name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">{apiRoleLabel(u.role)}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{u.is_active ? "Active" : "Inactive"}</span></td>
                    <td className="px-3 py-2">{formatLogin(u.last_login_at)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                          onClick={() => openRoleEditor(u)}
                        >
                          Edit Role
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                          onClick={() => void (u.is_active ? handleDeactivate(u.id) : handleActivate(u.id))}
                        >
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-rose-200 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={currentUser?.id === u.id}
                          title={currentUser?.id === u.id ? "You cannot delete your own account." : undefined}
                          onClick={() => void handleDeleteUser(u)}
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-50"
                          disabled={resetBusyId === u.id}
                          onClick={() => void initiateAdminPasswordReset(u)}
                        >
                          {resetBusyId === u.id ? "…" : "Reset Password"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === "audit" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Platform snapshot</h2>
            <p className="mt-1 text-xs text-slate-500">
              Refreshes automatically every 30 seconds while this tab is open. Detailed history is in the audit table below.
            </p>
            {overviewLoading ? (
              <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-teal-600 border-t-transparent align-middle" />
                Loading overview…
              </p>
            ) : null}
            {overviewError ? (
              <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {overviewError}
              </p>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Total Active Users</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{overview?.active_users_count ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Last Data Sync</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{overview?.last_data_sync ? formatLogin(overview.last_data_sync) : "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Pipeline Status</p>
                <p className={`mt-2 text-lg font-semibold ${pipelineHealthy ? "text-emerald-700" : "text-rose-700"}`}>{overview?.pipeline_status ?? pipeline?.last_status ?? "—"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-400">Pending Invitations</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">{overview?.pending_invitations_count ?? "—"}</p>
              </div>
            </div>
          </section>

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
            <select value={filterUserId} onChange={(e) => setFilterUserId(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="All">All</option>
              {userFilterOptions.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="All">All actions</option>
              {actionTypes.map((action) => (
                <option key={action} value={action}>{action}</option>
              ))}
            </select>
          </div>
          <div className="mb-4 grid gap-3 md:grid-cols-2">
            <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="All">All modules</option>
              {moduleTypes.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as "All" | "SUCCESS" | "FAILED")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="All">All statuses</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          {auditLoading && auditItems.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">Loading audit logs…</p>
          ) : null}
          {auditError ? (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{auditError}</p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>{["Timestamp", "User", "Action Type", "Affected Module", "Status"].map((h) => <th key={h} className="px-3 py-2 text-left font-semibold text-slate-600">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditItems.map((log) => (
                  <tr key={log.id}>
                    <td className="px-3 py-2">{log.timestamp}</td>
                    <td className="px-3 py-2">{log.user_email_snapshot ?? log.user_id ?? "—"}</td>
                    <td className="px-3 py-2">{log.action_type}</td>
                    <td className="px-3 py-2">{log.module}</td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{log.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-500">{auditItems.length} row{auditItems.length !== 1 ? "s" : ""} loaded</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={auditLoading || !auditCursor}
                onClick={() => void fetchAuditPage(auditCursor, false)}
                className="rounded-md border border-slate-200 px-3 py-1 disabled:opacity-50"
              >
                Load more
              </button>
            </div>
          </div>
        </section>
        </div>
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
                    {(["Admin", "Analyst", "Viewer"] as UiUserRole[]).map((role) => (
                      <label key={role} className="flex items-center justify-between rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-700">
                        <span>{role}</span>
                        <input type="checkbox" checked={module.visibility[role]} readOnly className="opacity-70" />
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
            {configMessage ? (
              <p className="mt-3 text-xs text-slate-600">{configMessage}</p>
            ) : null}
            <button
              type="button"
              disabled={configSaving}
              onClick={() => void handleSaveConfig()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <ShieldCheck className="h-4 w-4" /> Save Configuration
            </button>
          </div>
        </section>
      )}

      {roleEditUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Edit role</h3>
            <p className="mt-1 text-xs text-slate-500">
              {roleEditUser.full_name} · {roleEditUser.email}
            </p>
            <div className="mt-4">
              <label htmlFor="roleDraft" className="text-xs font-medium text-slate-700">
                Role
              </label>
              <select
                id="roleDraft"
                value={roleDraft}
                onChange={(e) => setRoleDraft(e.target.value as UiUserRole)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="Admin">Admin</option>
                <option value="Analyst">Analyst</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleEditUser(null)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={roleEditBusy}
                onClick={() => void submitRoleEdit()}
                className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {roleEditBusy ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Password reset link</h3>
            <p className="mt-1 text-xs text-slate-600">
              For <span className="font-medium text-slate-800">{resetPayload.email}</span>. Send this URL securely (Slack, in person). Expires{" "}
              {formatLogin(resetPayload.expires_at)}.
            </p>
            <p className="mt-2 text-xs text-amber-700">Copy now — treat like a one-time secret.</p>
            <input
              readOnly
              value={resetPayload.reset_url}
              className="mt-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800"
            />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => void copyResetUrl()}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                Copy
              </button>
              <button
                type="button"
                onClick={() => closeResetModal()}
                className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {!inviteUrlPayload ? (
              <>
                <h3 className="text-lg font-semibold text-slate-900">Invite New User</h3>
                <p className="mt-1 text-xs text-slate-500">Invite uses email and role only; the invitee sets their full name when registering.</p>
                <div className="mt-4 space-y-3">
                  <input placeholder="Email" type="email" required value={inviteForm.email} onChange={(e) => setInviteForm((p) => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
                  <select value={inviteForm.role} onChange={(e) => setInviteForm((p) => ({ ...p, role: e.target.value as UiUserRole }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <option value="Admin">Admin</option>
                    <option value="Analyst">Analyst</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <button type="button" onClick={() => closeInviteFlow()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Cancel</button>
                  <button type="button" disabled={inviteBusy} onClick={() => void submitInvite()} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{inviteBusy ? "Creating…" : "Create invite"}</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-slate-900">Invitation created</h3>
                <p className="mt-1 text-xs text-amber-700">Copy this URL now — it is shown only once.</p>
                <input readOnly value={inviteUrlPayload.invite_url} className="mt-4 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800" />
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => void copyInviteUrl()} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">Copy</button>
                  <button type="button" onClick={() => closeInviteFlow()} className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white">Done</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
