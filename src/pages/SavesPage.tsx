import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiUrl } from "../lib/api";

interface BackendModel {
  id: number;
  version: string;
  created_at: string;
  aic_score: number;
  notes: string | null;
}

interface ModelsResponse {
  available_models: BackendModel[];
}

const MODELS_API_URL = apiUrl("/api/models");
const UPLOAD_API_URL = apiUrl("/api/upload");
const RETRAIN_API_URL = apiUrl("/api/retrain");

interface UploadResponse {
  status: string;
  message: string;
  new_records: number;
}

interface UploadErrorResponse {
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown[];
  };
}

interface RetrainResponse {
  status: string;
  message: string;
  new_records_used?: number | null;
}

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

export const SavesPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const retrainStartedAtRef = useRef<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [models, setModels] = useState<BackendModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [isUploadReady, setIsUploadReady] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [retrainStatus, setRetrainStatus] = useState<string>("");
  const [retrainElapsedSeconds, setRetrainElapsedSeconds] = useState(0);
  const [successToast, setSuccessToast] = useState<string>("");

  const fetchModels = async (): Promise<BackendModel[]> => {
    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch(MODELS_API_URL);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data: ModelsResponse = await response.json();
      setModels(data.available_models ?? []);
      return data.available_models ?? [];
    } catch (error) {
      console.error("Unable to fetch models for saves page:", error);
      setLoadError(
        "Unable to load saves from backend. Please try again. If this is Vercel, verify backend proxy routing."
      );
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (!isRetraining) return;

    const intervalId = window.setInterval(() => {
      if (!retrainStartedAtRef.current) return;
      const elapsedMs = Date.now() - retrainStartedAtRef.current;
      setRetrainElapsedSeconds(Math.floor(elapsedMs / 1000));
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [isRetraining]);

  const handleOpenSave = (model: BackendModel) => {
    navigate("/simplified", {
      state: {
        selectedModelId: model.id,
        selectedModelVersion: model.version,
      },
    });
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
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(UPLOAD_API_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let errorMessage =
          "Upload failed. Please confirm the file format and try again.";
        try {
          const errorData = (await response.json()) as UploadErrorResponse;
          if (errorData?.error?.message) {
            errorMessage = errorData.error.message;
          } else if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch {
          errorMessage = `Upload failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result: UploadResponse = await response.json();
      setUploadStatus(
        `Upload complete. ${result.message} New records: ${result.new_records}.`
      );
      setIsUploadReady(true);

      await fetchModels();
    } catch (error: unknown) {
      console.error("Dataset upload failed:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during upload.";
      setUploadStatus(errorMessage);
      setIsUploadReady(false);
    } finally {
      setIsUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRetrain = async () => {
    try {
      setIsRetraining(true);
      setSuccessToast("");
      setRetrainElapsedSeconds(0);
      retrainStartedAtRef.current = Date.now();
      setRetrainStatus("Retraining pipeline started...");

      const retrainPayload = {
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

      const retrainResponse = await fetch(RETRAIN_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(retrainPayload),
      });

      if (!retrainResponse.ok) {
        throw new Error(`Retrain failed with status ${retrainResponse.status}`);
      }

      const retrainResult: RetrainResponse = await retrainResponse.json();
      setRetrainStatus(
        `${retrainResult.message} Fetching updated model registry...`
      );

      const updatedModels = await fetchModels();
      if (!updatedModels.length) {
        throw new Error("No models available after retrain.");
      }

      const latestModel = [...updatedModels].sort((a, b) => b.id - a.id)[0];
      setRetrainStatus(
        `Model ${latestModel.version} (ID ${latestModel.id}) ready. Validating dashboard outputs...`
      );

      const [dashboardResponse, advancedResponse] = await Promise.all([
        fetch(apiUrl(`/api/dashboard-stats/${latestModel.id}`)),
        fetch(apiUrl(`/api/advanced-metrics/${latestModel.id}`)),
      ]);

      if (!dashboardResponse.ok || !advancedResponse.ok) {
        throw new Error("Model outputs are not ready yet.");
      }

      localStorage.setItem("xocompass:selectedModelId", String(latestModel.id));
      localStorage.setItem(
        "xocompass:selectedModelVersion",
        latestModel.version
      );

      const elapsedSeconds = retrainStartedAtRef.current
        ? Math.floor((Date.now() - retrainStartedAtRef.current) / 1000)
        : 0;
      setRetrainElapsedSeconds(elapsedSeconds);
      setSuccessToast(
        `Pipeline completed in ${elapsedSeconds}s. Loading updated dashboard...`
      );

      window.setTimeout(() => {
        navigate("/simplified", {
          state: {
            selectedModelId: latestModel.id,
            selectedModelVersion: latestModel.version,
          },
        });
      }, 1200);
    } catch (error) {
      console.error("Retrain pipeline failed:", error);
      setRetrainStatus(
        "Retrain did not complete successfully. Please try again in a moment."
      );
    } finally {
      setIsRetraining(false);
      retrainStartedAtRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-md">
        <h1 className="text-2xl font-semibold text-slate-900">Saves</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose an existing save or start a new session with an updated
          dataset.
        </p>

        <div className="mt-8 space-y-4">
          {isLoading && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Loading saves from backend...
            </p>
          )}

          {loadError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {loadError}
            </p>
          )}

          {!isLoading &&
            !loadError &&
            [...models]
              .sort((a, b) => b.id - a.id)
              .map((model, index) => (
              <button
                key={model.id}
                type="button"
                onClick={() => handleOpenSave(model)}
                disabled={isUploading || isRetraining}
                className="w-full rounded-xl border border-slate-200 px-4 py-4 text-left transition hover:border-teal-400 hover:bg-teal-50/40"
              >
                <p className="text-base font-semibold text-slate-900">
                  Save {index + 1}
                </p>
                <p className="text-sm text-slate-500">
                  {formatProcessedDate(model.created_at)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Model {model.version} | AIC {model.aic_score.toFixed(2)}
                </p>
              </button>
            ))}

          {!isLoading && !loadError && models.length === 0 && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No saves available from backend yet.
            </p>
          )}

          <button
            type="button"
            onClick={handleNewSessionClick}
            disabled={isUploading || isRetraining}
            className="w-full rounded-xl border border-dashed border-teal-400 bg-teal-50/50 px-4 py-4 text-left transition hover:bg-teal-100/60"
          >
            <p className="text-base font-semibold text-teal-700">New Session</p>
            <p className="text-sm text-teal-600">
              {isUploading
                ? "Uploading dataset to backend..."
                : "Prompt to upload updated dataset"}
            </p>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json"
          className="hidden"
          onChange={handleFileChange}
        />

        {selectedFile && (
          <p className="mt-6 text-xs text-slate-500">
            Selected dataset: {selectedFile}
          </p>
        )}

        {uploadStatus && (
          <p className="mt-2 text-xs text-slate-600">{uploadStatus}</p>
        )}

        {isUploadReady && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-700">
              Dataset ready. You can start retraining.
            </p>
            <p className="mt-1 text-xs text-emerald-700/80">
              This will run the full backend pipeline and refresh model outputs.
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
          <p className="mt-3 text-xs text-slate-600">{retrainStatus}</p>
        )}

        {successToast && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successToast}
          </div>
        )}
      </div>

      {isRetraining && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
            <p className="text-base font-semibold text-slate-900">
              Retraining in progress
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Running ingestion, retrain, and evaluation. Please wait...
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Elapsed: {retrainElapsedSeconds}s
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
