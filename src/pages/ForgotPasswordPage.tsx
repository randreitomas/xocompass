import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ApiClientError } from "../lib/apiError";
import { formatApiErrorForUi } from "../lib/formatApiError";
import * as authService from "../services/authService";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [doneMessage, setDoneMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDoneMessage("");
    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword({
        email: email.trim(),
      });
      setDoneMessage(
        res.message ??
          "If an account exists for this email, a password reset link has been sent."
      );
      setEmail("");
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
            Forgot password
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Enter your work email. For security, we always show the same message
            whether or not an account exists.
          </p>

          {doneMessage ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              {doneMessage}
            </p>
          ) : null}

          <form className="mt-6 space-y-4" onSubmit={(e) => void handleSubmit(e)}>
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
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm outline-none ring-teal-500/0 transition focus:bg-white focus:ring-2"
                autoComplete="email"
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Sending…" : "Send reset link"}
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
