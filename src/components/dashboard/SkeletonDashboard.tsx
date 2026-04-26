import React from "react";

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-8 w-44 rounded-md bg-slate-200" />
          <div className="mt-2 h-4 w-80 rounded bg-slate-200/80" />
        </div>
        <div className="h-10 w-40 rounded-full border-2 border-dashed border-slate-300 bg-slate-100" />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="h-3 w-28 rounded bg-slate-200" />
            <div className="mt-2 text-3xl font-semibold text-slate-400">-</div>
            <div className="mt-3 h-3 w-24 rounded bg-slate-200/80" />
          </div>
        ))}
      </section>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-3 w-28 rounded bg-slate-200/80" />
        </div>
        <div className="h-72 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50" />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50"
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-36 rounded bg-slate-200" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-10 rounded-lg border border-dashed border-slate-300 bg-slate-50"
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
