import React from "react";
import { useNavigate } from "react-router-dom";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/simplified");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col md:flex-row">
        {/* Left: image / gradient */}
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-slate-900 md:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-700 opacity-80" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.3),_transparent_55%),_radial-gradient(circle_at_bottom,_rgba(15,23,42,0.9),_transparent_55%)]" />
          <div className="relative z-10 px-10 text-slate-50">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Realtime POS & Travel Demand Intelligence
            </div>
            <h1 className="text-3xl font-semibold leading-snug">
              See your{" "}
              <span className="text-teal-300">KJS travel business</span> in a
              single, intelligent compass.
            </h1>
            <p className="mt-4 text-sm text-slate-200/80">
              XoCompass turns raw POS data into actionable insights for revenue
              leaders, operations, and strategy teams.
            </p>
          </div>
        </div>

        {/* Right: auth card */}
        <div className="flex flex-1 items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                  XoCompass
                </p>
                <h2 className="mt-1 text-lg font-semibold text-slate-900">
                  Sign in to KJS Analytics
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Use your KJS admin or analyst credentials.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
                  placeholder="you@kjs-travel.com"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-slate-700"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    Forgot password?
                  </button>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                className="mt-2 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
              >
                Login
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

