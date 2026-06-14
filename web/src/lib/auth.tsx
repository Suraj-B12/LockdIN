/* =====================================================================
   Auth context — wraps Supabase session in a React provider.
   Exposes useAuth() and a <RequireAuth> route guard.
   ===================================================================== */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { Session, User } from "@supabase/supabase-js";
import { getSession, onAuthStateChange, signOut as sbSignOut } from "./supabase";
import { initOneSignal, identify, clearIdentity } from "./onesignal";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Bring up OneSignal once. No-ops if VITE_ONESIGNAL_APP_ID is unset, and
    // is fully self-guarded — push wiring must never break auth.
    void initOneSignal();

    getSession().then((s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    const unsubscribe = onAuthStateChange((s) => {
      if (!mounted) return;
      setSession(s);
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  // Keep OneSignal's external_id in sync with the signed-in user so the
  // backend's external_id-targeted pushes reach this browser. Fire-and-forget.
  const userId = session?.user?.id ?? null;
  useEffect(() => {
    if (userId) void identify(userId);
  }, [userId]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        // Detach this browser from the user so it stops receiving their pushes.
        // Guarded internally; never blocks or throws the sign-out.
        void clearIdentity();
        await sbSignOut();
        setSession(null);
      },
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}

/**
 * Route guard. Renders children only when a session exists.
 * While the session is resolving, shows a minimal centered loader (no flash
 * of the login page). Redirects to /login otherwise, preserving the intended
 * destination in location state.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-[100dvh] place-items-center bg-canvas">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-hairline/10 border-t-teal"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
