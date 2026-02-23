import React from "react";

interface StatusBadgeProps {
  label: string;
  tone?: "success" | "warning" | "error" | "default";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = "default",
}) => {
  const toneMap: Record<
    StatusBadgeProps["tone"],
    { bg: string; text: string }
  > = {
    success: { bg: "bg-emerald-50", text: "text-emerald-700" },
    warning: { bg: "bg-amber-50", text: "text-amber-700" },
    error: { bg: "bg-red-50", text: "text-red-700" },
    default: { bg: "bg-slate-100", text: "text-slate-700" },
  };

  const { bg, text } = toneMap[tone];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${bg} ${text}`}
    >
      {label}
    </span>
  );
};

