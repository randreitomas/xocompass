import React from "react";

interface SavesModalProps {
  open: boolean;
  lockOpen?: boolean;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export const SavesModal: React.FC<SavesModalProps> = ({
  open,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[8px]"
      style={{ WebkitBackdropFilter: "blur(8px)" }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-white/30 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.18)] backdrop-blur-[16px] sm:p-8"
        style={{ WebkitBackdropFilter: "blur(16px)" }}
      >
        <div className="mb-3 inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
          Cold Start
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {description}
        </p>
        <button
          type="button"
          onClick={onAction}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
};
