import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiClientError } from "../lib/apiError";
import { formatApiErrorForUi } from "../lib/formatApiError";
import * as authService from "../services/authService";

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const resetToken = useMemo(() => {
    const raw =
      searchParams.get("token")?.trim() ??
      searchParams.get("reset_token")?.trim() ??
      "";
    return raw;
  }, [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!resetToken) {
      setError("This link is missing a token. Open the reset URL from your email or admin.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword({
        token: resetToken,
        new_password: password,
      });
      navigate("/login", {
        replace: true,
        state: {
          resetNotice:
            "Password updated. Sign in with your new password.",
        },
      });
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
            Set a new password
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Choose a strong password. After saving you will need to sign in again.
          </p>

          {!resetToken ? (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Missing reset token. Use the link from your reset email or the URL
              your administrator shared (it should include{" "}
              <span className="font-mono">?token=…</span>).
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
            <div>
              <label
                htmlFor="password"
                className="text-xs font-medium text-slate-700"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label
                htmlFor="confirmPassword"
                className="text-xs font-medium text-slate-700"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(ev) => setConfirmPassword(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
                autoComplete="new-password"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting || !resetToken}
              className="mt-2 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Updating…" : "Update password"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            <Link
              to="/login"
              className="font-semibold text-teal-600 hover:text-teal-700"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
