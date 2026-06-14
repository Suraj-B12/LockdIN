/* =====================================================================
   App — providers + router.
   Public routes: /, /login, /onboarding (+ marketing layout).
   Protected routes (RequireAuth + AppLayout): /dashboard, /leaderboard,
   /history, /profile, /settings.
   Grain + Toaster mount once at the root, above everything.

   Routes are code-split (React.lazy) so each screen ships as its own chunk
   and only loads on navigation. The Landing stays eager — it's the marketing
   entry point and benefits from the fastest possible first paint.
   ===================================================================== */
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryProvider } from "@/lib/query-client";
import { AuthProvider, RequireAuth } from "@/lib/auth";
import { GrainOverlay, Toaster } from "@/components/ui";
import { AppLayout } from "@/components/layouts/AppLayout";
import { PublicLayout } from "@/components/layouts/PublicLayout";
import { Landing } from "@/pages/Landing";

// Lazy routes (named exports → map to default for React.lazy).
const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })));
const Onboarding = lazy(() => import("@/pages/Onboarding").then((m) => ({ default: m.Onboarding })));
const Privacy = lazy(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })));
const Dashboard = lazy(() => import("@/pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Leaderboard = lazy(() => import("@/pages/Leaderboard").then((m) => ({ default: m.Leaderboard })));
const History = lazy(() => import("@/pages/History").then((m) => ({ default: m.History })));
const Profile = lazy(() => import("@/pages/Profile").then((m) => ({ default: m.Profile })));
const Settings = lazy(() => import("@/pages/Settings").then((m) => ({ default: m.Settings })));
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })));

/** Minimal branded fallback while a route chunk loads. */
function RouteFallback() {
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

export default function App() {
  return (
    <QueryProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public marketing + auth */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/onboarding" element={<Onboarding />} />
              </Route>
              <Route path="/login" element={<Login />} />

              {/* Legal (public, standalone — own crisp chrome, no marketing orbs) */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

              {/* Authenticated app */}
              <Route
                element={
                  <RequireAuth>
                    <AppLayout />
                  </RequireAuth>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/history" element={<History />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

          <GrainOverlay />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </QueryProvider>
  );
}
