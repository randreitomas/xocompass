import React from "react";

interface ChartContainerProps {
  title: string;
  description?: string;
  headerMeta?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  headerMeta,
  children,
}) => {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-[14px] text-slate-600">{description}</p>
          )}
        </div>
        {headerMeta && (
          <div className="pt-0.5 text-[12px] font-medium text-slate-500">
            {headerMeta}
          </div>
        )}
      </div>
      <div className="h-80">{children}</div>
    </section>
  );
};

