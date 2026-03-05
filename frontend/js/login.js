/**
 * Login Page Logic
 * Handles Google sign-in and redirects to dashboard on success.
 */

document.addEventListener('DOMContentLoaded', async () => {
    const googleBtn = document.getElementById('googleSignInBtn');
    const loginError = document.getElementById('loginError');
    const loginContent = document.getElementById('loginContent');
    const loginSuccess = document.getElementById('loginSuccess');

    // ---- Check if already logged in ----
    const session = await getSession();
    if (session) {
        // Already signed in — go to dashboard
        window.location.href = '/dashboard.html';
        return;
    }

    // ---- Handle OAuth callback (if returning from Google) ----
    // Supabase handles the hash fragment automatically.
    // We listen for auth state changes to detect successful login.
    onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
            // Show success state
            loginContent.style.display = 'none';
            loginSuccess.classList.add('visible');

            // Detect new signup vs returning login
            const createdAt = new Date(session.user.created_at);
            const isNewUser = (Date.now() - createdAt.getTime()) < 60000; // within last 60s
            const destination = isNewUser ? '/onboarding.html' : '/dashboard.html';

            // Redirect after a short delay
            setTimeout(() => {
                window.location.href = destination;
            }, 1000);
        }
    });

    // ---- Google Sign-In Button ----
    googleBtn.addEventListener('click', async () => {
        googleBtn.classList.add('loading');
        loginError.classList.remove('visible');

        try {
            await signInWithGoogle();
            // The page will redirect to Google — nothing more to do here.
        } catch (error) {
            googleBtn.classList.remove('loading');
            loginError.textContent = error.message || 'Sign-in failed. Please try again.';
            loginError.classList.add('visible');
        }
    });
});
