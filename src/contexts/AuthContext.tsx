import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { configureApiClient } from "../lib/apiClient";
import { authAccessHolder } from "../lib/authAccessHolder";
import * as authService from "../services/authService";
import type { components } from "../types/api";
import type { AppRole } from "../types/roles";

export type { AppRole };
export type AuthenticatedUser = components["schemas"]["AuthenticatedUser"];
type MeResponse = components["schemas"]["MeResponse"];

const REFRESH_STORAGE_KEY = "xocompass:refreshToken";

function meToAuthenticatedUser(me: MeResponse): AuthenticatedUser {
  return {
    id: me.id,
    email: me.email,
    full_name: me.full_name,
    role: me.role,
    is_active: me.is_active,
  };
}

interface AuthContextValue {
  user: AuthenticatedUser | null;
  accessToken: string | null;
  role: AppRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const hardLogout = useCallback(() => {
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    authAccessHolder.token = null;
    setAccessToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (!refreshToken) return false;
    try {
      const data = await authService.refresh({ refresh_token: refreshToken });
      localStorage.setItem(REFRESH_STORAGE_KEY, data.refresh_token);
      authAccessHolder.token = data.access_token;
      setAccessToken(data.access_token);
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    configureApiClient({
      refreshTokens,
      hardLogout,
    });
  }, [refreshTokens, hardLogout]);

  useEffect(() => {
    authAccessHolder.token = accessToken;
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
      if (!refreshToken) {
        setIsLoading(false);
        return;
      }

      authAccessHolder.token = null;
      setAccessToken(null);

      try {
        const tokens = await authService.refresh({ refresh_token: refreshToken });
        if (cancelled) return;
        localStorage.setItem(REFRESH_STORAGE_KEY, tokens.refresh_token);
        authAccessHolder.token = tokens.access_token;
        setAccessToken(tokens.access_token);

        const me = await authService.getMe();
        if (cancelled) return;
        setUser(meToAuthenticatedUser(me));
      } catch {
        if (cancelled) return;
        localStorage.removeItem(REFRESH_STORAGE_KEY);
        authAccessHolder.token = null;
        setUser(null);
        setAccessToken(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    localStorage.setItem(REFRESH_STORAGE_KEY, response.refresh_token);
    authAccessHolder.token = response.access_token;
    setAccessToken(response.access_token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_STORAGE_KEY);
    if (refreshToken) {
      try {
        await authService.logout({ refresh_token: refreshToken });
      } catch {
        /* idempotent server-side */
      }
    }
    localStorage.removeItem(REFRESH_STORAGE_KEY);
    authAccessHolder.token = null;
    setAccessToken(null);
    setUser(null);
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      role: user?.role ?? null,
      isLoading,
      login,
      logout,
      refreshTokens,
    }),
    [user, accessToken, isLoading, login, logout, refreshTokens]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
