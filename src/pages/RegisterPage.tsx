import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiClientError } from "../lib/apiError";
import { formatApiErrorForUi } from "../lib/formatApiError";
import * as authService from "../services/authService";
import { authAccessHolder } from "../lib/authAccessHolder";

const REFRESH_STORAGE_KEY = "xocompass:refreshToken";

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const inviteToken = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams]
  );

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!inviteToken) {
      setError("Registration requires a valid invite link (?token=).");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await authService.register({
        invite_token: inviteToken,
        full_name: fullName.trim(),
        password,
      });
      localStorage.setItem(REFRESH_STORAGE_KEY, response.refresh_token);
      authAccessHolder.token = response.access_token;
      window.location.assign("/business-analytics");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(formatApiErrorForUi(err));
      } else {
        setError(formatApiErrorForUi(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-12">
        <div className="rounded-2xl bg-white p-8 shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
            XoCompass
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900">
            Complete registration
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Set your name and password using the invite link from your admin.
          </p>

          {!inviteToken ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Missing invite token. Open the invite URL you received, or ask an
              admin to send a new invitation.
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <label
                htmlFor="fullName"
                className="text-xs font-medium text-slate-700"
              >
                Full name
              </label>
              <input
                id="fullName"
                required
                value={fullName}
                onChange={(ev) => setFullName(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-xs font-medium text-slate-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="text-xs font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !inviteToken}
              className="mt-2 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-teal-600 hover:text-teal-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
