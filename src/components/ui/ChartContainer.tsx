import React from "react";

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <section className="rounded-xl border border-slate-300 bg-white p-6 shadow-md">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-500">{description}</p>
          )}
        </div>
      </div>
      <div className="h-80">{children}</div>
    </section>
  );
};

