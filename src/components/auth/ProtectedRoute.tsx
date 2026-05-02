import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import type { AppRole } from "../../types/roles";
import { meetsMinimumRole } from "../../lib/accessControl";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requiredRole?: AppRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-slate-600">
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent"
            aria-hidden
          />
          <p className="text-sm font-medium">Checking your session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (requiredRole && role && !meetsMinimumRole(role, requiredRole)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
        <h1 className="text-xl font-semibold text-slate-900">
          You don&apos;t have permission
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          Your role ({role}) cannot open this area. Role changes can take up to
          15 minutes to apply—try refreshing after your administrator updates
          access.
        </p>
      </div>
    );
  }

  return children;
};
