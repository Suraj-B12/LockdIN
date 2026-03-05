/**
 * Supabase Client — initializes Supabase JS and exposes auth helpers.
 * Uses the Supabase CDN build (loaded via <script> tag in HTML).
 *
 * IMPORTANT: We use `supabaseClient` as the variable name to avoid
 * shadowing `window.supabase` (the CDN library namespace).
 */

// ---- Configuration ----
const SUPABASE_URL = 'https://pgrtaxjxmngwjmrzfbrc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBncnRheGp4bW5nd2ptcnpmYnJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwODMwMDksImV4cCI6MjA4NjY1OTAwOX0.k7x7Ku5gn4a2U6rQhAQT6OrA2t2s0l5kem6U3UfeUiM';

// Initialize client (named `supabaseClient` to avoid shadowing the CDN object)
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Auth Helpers (attached to window for cross-script access) ----

/**
 * Sign in with Google OAuth via Supabase.
 * Redirects the user to Google's consent screen.
 */
window.signInWithGoogle = async function () {
    const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/onboarding.html'
        }
    });
    if (error) {
        console.error('Google sign-in error:', error.message);
        throw error;
    }
    return data;
};

/**
 * Sign out the current user.
 * Clears the local session and redirects to login.
 */
window.signOut = async function () {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error('Sign-out error:', error.message);
    }
    window.location.href = '/login.html';
};

/**
 * Get the current session (access token + user).
 * Returns null if not logged in.
 */
window.getSession = async function () {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error('Get session error:', error.message);
        return null;
    }
    return session;
};

/**
 * Get the current user from the session.
 * Returns null if not logged in.
 */
window.getUser = async function () {
    const session = await getSession();
    return session?.user ?? null;
};

/**
 * Get the current access token (JWT).
 * Returns null if not logged in.
 */
window.getAccessToken = async function () {
    const session = await getSession();
    return session?.access_token ?? null;
};

/**
 * Listen for auth state changes (sign in, sign out, token refresh).
 */
window.onAuthStateChange = function (callback) {
    return supabaseClient.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
};

/**
 * Auth guard — call this on protected pages.
 * Redirects to login if there's no valid session.
 */
window.requireAuth = async function () {
    const session = await getSession();
    if (!session) {
        window.location.href = '/login.html';
        return null;
    }
    return session;
};

// Also expose the client instance globally for api.js
window.supabaseClient = supabaseClient;
