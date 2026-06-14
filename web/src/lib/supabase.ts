/* =====================================================================
   Supabase client + auth helpers.
   Reuses the project's existing Supabase project (anon key from env).
   ===================================================================== */
import { createClient, type Session } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Fail loud in dev; a misconfigured env is the #1 onboarding footgun.
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy web/.env.example to web/.env."
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Where Google sends the user back after consent. */
const OAUTH_REDIRECT =
  typeof window !== "undefined" ? `${window.location.origin}/onboarding` : undefined;

/** Begin Google OAuth. Redirects to Google's consent screen. */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: OAUTH_REDIRECT },
  });
  if (error) {
    console.error("[supabase] Google sign-in error:", error.message);
    throw error;
  }
  return data;
}

/** Sign out the current user. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) console.error("[supabase] Sign-out error:", error.message);
}

/** Current session (access token + user) or null. */
export async function getSession(): Promise<Session | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error) {
    console.error("[supabase] getSession error:", error.message);
    return null;
  }
  return session;
}

/** Current JWT access token or null. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/** Force a session refresh once. Returns the refreshed session or null. */
export async function refreshSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) return null;
  return data.session ?? null;
}

/** Subscribe to auth state changes. Returns an unsubscribe handle. */
export function onAuthStateChange(
  callback: (session: Session | null) => void
) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
