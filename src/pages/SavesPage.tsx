import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BusinessAnalyticsPage } from "./BusinessAnalyticsPage";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { useAuth } from "../contexts/AuthContext";
import { canUploadOrRetrain } from "../lib/accessControl";
import { ApiClientError } from "../lib/apiError";
import { formatApiErrorForUi } from "../lib/formatApiError";
import * as dashboardService from "../services/dashboardService";
import * as uploadService from "../services/uploadService";
import * as adminService from "../services/adminService";
import * as savesService from "../services/savesService";
import type { components } from "../types/api";

type ModelDropdownItem = components["schemas"]["ModelDropdownItem"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatProcessedDate = (dateValue: string) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Processed date unavailable";
  return `Processed ${date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
};

const getDateGroup = (dateValue: string): string => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "EARLIER";
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays < 1) return "TODAY";
  if (diffDays < 7) return "THIS WEEK";
  return "EARLIER";
};

type SortKey = "newest" | "lowest_aic" | "name";

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  onDone: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, onDone }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Mount → fade in
    const showTimer = window.setTimeout(() => setVisible(true), 20);
    // After 2s → fade out
    const hideTimer = window.setTimeout(() => setVisible(false), 2000);
    // After fade-out → remove
    const doneTimer = window.setTimeout(onDone, 2350);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      window.clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        transition: "opacity 0.3s ease, transform 0.3s ease",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
      }}
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
};

// ─── SaveCard ─────────────────────────────────────────────────────────────────

interface SaveCardProps {
  model: ModelDropdownItem;
  index: number;
  isActive: boolean;
  isDisabled: boolean;
  showMutateActions: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  removing: boolean;
}

const SaveCard: React.FC<SaveCardProps> = ({
  model,
  index,
  isActive,
  isDisabled,
  showMutateActions,
  onOpen,
  onRename,
  onDelete,
  removing,
}) => {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const displayName =
    model.model_name.trim() ||
    model.notes?.trim() ||
    `Save ${index + 1}`;

  return (
    <div
      style={{
        transition: "opacity 0.25s ease, transform 0.25s ease",
        opacity: removing ? 0 : 1,
        transform: removing ? "scale(0.97)" : "scale(1)",
      }}
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition-colors ${
        isActive
          ? "border-emerald-400 ring-1 ring-emerald-300"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Main card row */}
      <div className="flex items-start gap-3 px-4 py-4">
        {/* Clickable info area */}
        <button
          type="button"
          onClick={onOpen}
          disabled={isDisabled}
          className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900">
              {displayName}
            </span>
            {isActive && (
              <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Active
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {formatProcessedDate(model.created_at)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">AIC</span>{" "}
            {model.aic_score != null && Number.isFinite(model.aic_score)
              ? model.aic_score.toFixed(2)
              : "—"}
            <span className="mx-1.5 text-slate-300">·</span>
            Model {model.version}
          </p>
        </button>

        {/* Actions */}
        {showMutateActions ? (
        <div className="flex shrink-0 items-center gap-1 pt-0.5">
          {/* Rename */}
          <button
            type="button"
            onClick={onRename}
            disabled={isDisabled}
            title="Rename"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>

          {/* Delete toggle */}
          <button
            type="button"
            onClick={() => setConfirmOpen((v) => !v)}
            disabled={isDisabled}
            title="Delete"
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition disabled:cursor-not-allowed disabled:opacity-50 ${
              confirmOpen
                ? "bg-red-100 text-red-600"
                : "text-slate-400 hover:bg-red-50 hover:text-red-500"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
        ) : null}
      </div>

      {/* Inline delete confirmation strip */}
      {showMutateActions ? (
      <div
        style={{
          display: "grid",
          gridTemplateRows: confirmOpen ? "1fr" : "0fr",
          transition: "grid-template-rows 0.2s ease",
        }}
      >
        <div className="overflow-hidden">
          <div className="flex items-center justify-between border-t border-red-100 bg-red-50 px-4 py-2.5">
            <p className="text-xs text-red-700">
              Delete{" "}
              <span className="font-semibold">"{displayName}"</span>? This
              can't be undone.
            </p>
            <div className="ml-4 flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  onDelete();
                }}
                className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
      ) : null}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const SavesPage: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const canTrain = canUploadOrRetrain(role);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retrainStartedAtRef = useRef<number | null>(null);

  // ── Existing state (unchanged semantics) ──
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [models, setModels] = useState<ModelDropdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploadReady, setIsUploadReady] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainStatus, setRetrainStatus] = useState<string>("");
  const [retrainElapsedSeconds, setRetrainElapsedSeconds] = useState(0);
  const [isMutatingSave, setIsMutatingSave] = useState(false);

  // ── New UI state ──
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [activeModelId, setActiveModelId] = useState<number | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [toastKey, setToastKey] = useState(0);
  const [workspaceSessionCount, setWorkspaceSessionCount] = useState<
    number | null
  >(null);

  // ── Derived: most recent model version ──
  const latestVersion = useMemo(() => {
    if (!models.length) return null;
    return [...models].sort((a, b) => b.id - a.id)[0].version;
  }, [models]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setToastKey((k) => k + 1);
  };

  const getDisplayName = (model: ModelDropdownItem, index: number) =>
    model.model_name.trim() || model.notes?.trim() || `Save ${index + 1}`;

  // ── Filtered + sorted models ──
  const processedModels = useMemo(() => {
    let list = [...models];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((m, i) =>
        getDisplayName(m, i).toLowerCase().includes(q)
      );
    }

    if (sortKey === "newest") {
      list.sort((a, b) => b.id - a.id);
    } else if (sortKey === "lowest_aic") {
      list.sort((a, b) => {
        const aAic = a.aic_score;
        const bAic = b.aic_score;
        if (aAic == null && bAic == null) return 0;
        if (aAic == null) return 1;
        if (bAic == null) return -1;
        return aAic - bAic;
      });
    } else {
      list.sort((a, b) =>
        getDisplayName(a, 0).localeCompare(getDisplayName(b, 0))
      );
    }

    return list;
  }, [models, searchQuery, sortKey]);

  // ── Date groups ──
  const grouped = useMemo(() => {
    const groups: Record<string, ModelDropdownItem[]> = {};
    const order = ["TODAY", "THIS WEEK", "EARLIER"];
    for (const m of processedModels) {
      const g = getDateGroup(m.created_at);
      if (!groups[g]) groups[g] = [];
      groups[g].push(m);
    }
    return order
      .filter((g) => groups[g]?.length)
      .map((g) => ({ label: g, items: groups[g] }));
  }, [processedModels]);

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchModels = async (): Promise<ModelDropdownItem[]> => {
    try {
      setIsLoading(true);
      setLoadError("");
      const data = await dashboardService.getModels();
      const list = data.available_models ?? [];
      setModels(list);
      return list;
    } catch (error) {
      console.error("Unable to fetch models for saves page:", error);
      setLoadError(formatApiErrorForUi(error));
      setModels([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchModels();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void savesService
      .getSessions()
      .then((r) => {
        if (!cancelled) setWorkspaceSessionCount(r.sessions.length);
      })
      .catch(() => {
        if (!cancelled) setWorkspaceSessionCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRetraining) return;
    const poll = () => {
      void adminService.getPipelineStatus().catch(() => undefined);
    };
    poll();
    const intervalId = window.setInterval(poll, 30000);
    return () => window.clearInterval(intervalId);
  }, [isRetraining]);

  useEffect(() => {
    if (!isRetraining) return;
    const intervalId = window.setInterval(() => {
      if (!retrainStartedAtRef.current) return;
      const elapsedMs = Date.now() - retrainStartedAtRef.current;
      setRetrainElapsedSeconds(Math.floor(elapsedMs / 1000));
    }, 500);
    return () => window.clearInterval(intervalId);
  }, [isRetraining]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenSave = (model: ModelDropdownItem, index: number) => {
    setActiveModelId(model.id);
    showToast(`Loaded "${getDisplayName(model, index)}"`);
    navigate("/business-analytics", {
      state: {
        selectedModelId: model.id,
        selectedModelVersion: model.version,
      },
    });
  };

  const handleRenameSave = async (model: ModelDropdownItem, index: number) => {
    const currentName = getDisplayName(model, index);
    const proposed = window.prompt("Rename save", currentName);
    if (proposed === null) return;
    const nextName = proposed.trim();
    if (!nextName || nextName === currentName) return;

    try {
      setIsMutatingSave(true);
      await dashboardService.renameModel(model.id, {
        new_model_name: nextName,
      });
      await fetchModels();
      showToast("Save renamed.");
    } catch (error) {
      console.error("Rename save failed:", error);
      showToast(formatApiErrorForUi(error));
    } finally {
      setIsMutatingSave(false);
    }
  };

  const handleDeleteSave = async (model: ModelDropdownItem, index: number) => {
    const name = getDisplayName(model, index);
    try {
      setRemovingId(model.id);
      setIsMutatingSave(true);

      // Let animation play
      await new Promise((r) => window.setTimeout(r, 250));

      await dashboardService.deleteModel(model.id);

      if (activeModelId === model.id) setActiveModelId(null);
      await fetchModels();
      showToast(`Deleted "${name}"`);
    } catch (error) {
      console.error("Delete save failed:", error);
      showToast(formatApiErrorForUi(error));
    } finally {
      setRemovingId(null);
      setIsMutatingSave(false);
    }
  };

  const handleNewSessionClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus("");
    setIsUploading(true);
    setIsUploadReady(false);
    setSelectedFile(file.name);

    try {
      const result = await uploadService.uploadCSV(file);
      setUploadStatus(
        `Upload complete. ${result.message} New records: ${result.new_records}.`
      );
      setIsUploadReady(true);
      await fetchModels();
    } catch (error: unknown) {
      console.error("Dataset upload failed:", error);
      const errorMessage =
        error instanceof ApiClientError
          ? formatApiErrorForUi(error)
          : error instanceof Error
            ? error.message
            : "An unexpected error occurred during upload.";
      setUploadStatus(errorMessage);
      setIsUploadReady(false);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRetrain = async () => {
    try {
      setIsRetraining(true);
      setRetrainElapsedSeconds(0);
      retrainStartedAtRef.current = Date.now();
      setRetrainStatus("Retraining pipeline started...");

      const retrainPayload: components["schemas"]["RetrainRequest"] = {
        time_period: "30 Days",
        target_variable: "Booking Date",
        external_factors: [
          "Typhoon",
          "Rainfall Index",
          "Temperature",
          "Wind Speed",
          "Holiday",
        ],
        model_selection: "SARIMAX",
      };

      const retrainResult = await uploadService.triggerRetrain(retrainPayload);
      setRetrainStatus(
        `${retrainResult.message} Fetching updated model registry...`
      );

      const updatedModels = await fetchModels();
      if (!updatedModels.length)
        throw new Error("No models available after retrain.");

      const latestModel = [...updatedModels].sort((a, b) => b.id - a.id)[0];
      setRetrainStatus(
        `Model ${latestModel.version} (ID ${latestModel.id}) ready. Validating dashboard outputs...`
      );

      await Promise.all([
        dashboardService.getDashboardStats(latestModel.id),
        dashboardService.getAdvancedMetrics(latestModel.id),
      ]);

      localStorage.setItem(
        "xocompass:selectedModelId",
        String(latestModel.id)
      );
      localStorage.setItem(
        "xocompass:selectedModelVersion",
        latestModel.version
      );

      const defaultName = `Model ${latestModel.version} (ID ${latestModel.id})`;
      const getBackendSaveName = (m: ModelDropdownItem) =>
        m.model_name.trim() || m.notes?.trim() || null;
      const chosenName = window
        .prompt("Name this save", defaultName)
        ?.trim();

      if (chosenName && chosenName !== getBackendSaveName(latestModel)) {
        try {
          await dashboardService.renameModel(latestModel.id, {
            new_model_name: chosenName,
          });
          await fetchModels();
        } catch (error) {
          console.error("Auto-rename after retrain failed:", error);
        }
      }

      const elapsedSeconds = retrainStartedAtRef.current
        ? Math.floor((Date.now() - retrainStartedAtRef.current) / 1000)
        : 0;
      setRetrainElapsedSeconds(elapsedSeconds);
      showToast(`Pipeline completed in ${elapsedSeconds}s. Loading dashboard...`);

      window.setTimeout(() => {
        navigate("/business-analytics", {
          state: {
            selectedModelId: latestModel.id,
            selectedModelVersion: latestModel.version,
          },
        });
      }, 1200);
    } catch (error) {
      console.error("Retrain pipeline failed:", error);
      setRetrainStatus(formatApiErrorForUi(error));
    } finally {
      setIsRetraining(false);
      retrainStartedAtRef.current = null;
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const isDisabled = isUploading || isRetraining || isMutatingSave;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50">
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none select-none">
        <div className="h-[114dvh] min-h-[860px] w-[114vw] min-w-[1200px] -translate-x-[7vw] -translate-y-[5vh] origin-top-left scale-[0.3] transform-gpu md:scale-[0.70] xl:scale-95">
          <div className="h-full w-full overflow-hidden bg-gray-50 text-slate-900">
            <div className="flex h-full">
              <Sidebar isCollapsed={false} onToggle={() => undefined} />
              <div className="ml-64 flex flex-1 flex-col">
                <Header pageTitle="Business Analytics Dashboard" />
                <main className="flex-1 overflow-hidden bg-gray-50 p-8">
                  <BusinessAnalyticsPage isBackgroundPreview={true} />
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 z-10 pointer-events-none bg-white/30 backdrop-blur-md" />

      <div className="relative z-20 flex min-h-screen items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-2xl rounded-2xl border border-white/30 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-[64px] sm:p-8">

        {/* ── Header ── */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Saves
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {models.length} model save{models.length !== 1 ? "s" : ""}
              {workspaceSessionCount != null ? (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {workspaceSessionCount} workspace session
                  {workspaceSessionCount !== 1 ? "s" : ""}
                </>
              ) : null}
              {latestVersion && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  Model {latestVersion}
                </>
              )}
            </p>
          </div>

          {canTrain ? (
          <button
            type="button"
            onClick={handleNewSessionClick}
            disabled={isDisabled}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            New session
          </button>
          ) : null}
        </div>

        {/* ── Controls row ── */}
        <div className="mb-5 flex gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="text"
              placeholder="Search saves..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm outline-none transition focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          >
            <option value="newest">Newest</option>
            <option value="lowest_aic">Lowest AIC</option>
            <option value="name">Name</option>
          </select>
        </div>

        {/* ── Content area ── */}
        {isLoading && (
          <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            Loading saves…
          </p>
        )}

        {loadError && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {loadError}
          </p>
        )}

        {!isLoading && !loadError && (
          <>
            {grouped.length === 0 && (
              <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                {searchQuery
                  ? "No saves match your search."
                  : "No saves yet. Upload your first KJS booking dataset to unlock the live dashboard."}
              </p>
            )}

            {grouped.map(({ label, items }) => (
              <div key={label} className="mb-6">
                {/* Group label */}
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </p>

                <div className="space-y-2">
                  {items.map((model, i) => (
                    <SaveCard
                      key={model.id}
                      model={model}
                      index={models.indexOf(model)}
                      isActive={activeModelId === model.id}
                      isDisabled={isDisabled}
                      showMutateActions={canTrain}
                      onOpen={() => handleOpenSave(model, models.indexOf(model))}
                      onRename={() =>
                        handleRenameSave(model, models.indexOf(model))
                      }
                      onDelete={() =>
                        handleDeleteSave(model, models.indexOf(model))
                      }
                      removing={removingId === model.id}
                    />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── Upload status ── */}
        {selectedFile && (
          <p className="mt-4 text-xs text-slate-400">
            Selected: {selectedFile}
          </p>
        )}
        {uploadStatus && (
          <p className="mt-1 text-xs text-slate-500">{uploadStatus}</p>
        )}

        {/* ── Retrain panel ── */}
        {canTrain && isUploadReady && (
          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">
              Dataset ready. Start retraining?
            </p>
            <p className="mt-1 text-xs text-emerald-600/80">
              Runs the full backend pipeline and refreshes model outputs.
            </p>
            <button
              type="button"
              onClick={handleRetrain}
              disabled={isRetraining}
              className="mt-3 inline-flex items-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Retrain Model
            </button>
          </div>
        )}

        {retrainStatus && (
          <p className="mt-3 text-xs text-slate-500">{retrainStatus}</p>
        )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Retraining overlay (unchanged) ── */}
      {isRetraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
            <p className="text-base font-semibold text-slate-900">
              Retraining in progress
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Running ingestion, retrain, and evaluation. Please wait…
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Elapsed: {retrainElapsedSeconds}s
            </p>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toastMessage && (
        <Toast
          key={toastKey}
          message={toastMessage}
          onDone={() => setToastMessage("")}
        />
      )}
    </div>
  );
};