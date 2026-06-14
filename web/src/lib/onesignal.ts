/* =====================================================================
   OneSignal Web Push — frontend subscription + identity wiring.

   ───────────────────────────────────────────────────────────────────
   ⚠️  DASHBOARD SETUP STILL REQUIRED (cannot be done in code):
   Pushes will NOT be delivered until, in the OneSignal dashboard, you:
     1. Settings → Push & In-App → Web → set up a **Web Push** platform.
     2. Set the Site URL to the DEPLOYED origin (and add http://localhost
        for local dev so `allowLocalhostAsSecureOrigin` works).
     3. Under "Service Worker" / advanced, confirm the worker matches what
        this app registers: file path "sw.js", scope "/" (we point OneSignal
        at the custom Workbox SW via serviceWorkerPath / Override below — we
        do NOT serve OneSignalSDKWorker.js separately).
     4. Save, then test on a REAL device. iOS requires the PWA be INSTALLED
        to the home screen first, on iOS/iPadOS 16.4+.
   ───────────────────────────────────────────────────────────────────

   How this connects to the backend: the FastAPI notifications service already
   SENDS via OneSignal, targeting `external_id = the Supabase user id`. Here we
   subscribe the browser and call OneSignal.login(userId) so this device is
   reachable by that external_id. No player-id round-trip to our backend needed.

   Resilience contract: every export is guarded and NEVER throws to its caller.
   If VITE_ONESIGNAL_APP_ID is unset, init() is a logged no-op so the rest of
   the app (auth, etc.) works unchanged in dev. ===================================================================== */
import OneSignal from "react-onesignal";

const APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID;

/** Push permission as the UI cares about it. "unsupported" = no SDK / no app id
 *  / browser can't do web push. */
export type PushPermission = NotificationPermission | "unsupported";

// init() must run exactly once. We memoize the in-flight promise so concurrent
// callers (e.g. auth mount + a settings render) all await the same init.
let initPromise: Promise<boolean> | null = null;
let ready = false;

/** True once OneSignal.init has resolved successfully. */
export function isPushReady(): boolean {
  return ready;
}

/**
 * Idempotent OneSignal initializer. Safe to call from multiple places.
 * Returns true if the SDK initialized, false if it no-op'd (no app id) or failed.
 */
export function initOneSignal(): Promise<boolean> {
  if (initPromise) return initPromise;

  if (!APP_ID) {
    // No app id → stay completely inert so dev without OneSignal still works.
    if (import.meta.env.DEV) {
      console.info(
        "[onesignal] VITE_ONESIGNAL_APP_ID is unset — web push disabled (no-op)."
      );
    }
    initPromise = Promise.resolve(false);
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await OneSignal.init({
        appId: APP_ID,
        // Lets the SDK treat http://localhost as a secure origin during dev so
        // you can test the subscription flow without HTTPS.
        allowLocalhostAsSecureOrigin: true,
        // Point OneSignal at OUR custom Workbox service worker instead of letting
        // it register its own OneSignalSDKWorker.js (which would fight for the
        // root scope). sw.ts importScripts the OneSignal worker SDK, so a single
        // registration serves both PWA caching and push. vite-plugin-pwa emits
        // the compiled worker as /sw.js at the site root.
        serviceWorkerPath: "sw.js",
        serviceWorkerParam: { scope: "/" },
        serviceWorkerOverrideForTypical: true,
        // We drive the permission prompt ourselves from PushCard, so suppress
        // OneSignal's auto slidedown.
        autoResubscribe: true,
        promptOptions: {
          slidedown: { prompts: [{ type: "push", autoPrompt: false, delay: {} }] },
        },
      });
      ready = true;
      return true;
    } catch (err) {
      // Never let push setup break the app. Reset so a later call can retry.
      console.warn("[onesignal] init failed:", err);
      ready = false;
      initPromise = null;
      return false;
    }
  })();

  return initPromise;
}

/**
 * Associate this browser subscription with the signed-in user so backend pushes
 * targeted at `external_id = userId` reach this device. Idempotent and safe to
 * call before init resolves (it awaits init first).
 */
export async function identify(userId: string): Promise<void> {
  try {
    const ok = await initOneSignal();
    if (!ok || !userId) return;
    await OneSignal.login(userId);
  } catch (err) {
    console.warn("[onesignal] identify failed:", err);
  }
}

/** Detach the current user's identity from this browser (call on sign-out). */
export async function clearIdentity(): Promise<void> {
  try {
    if (!ready) return;
    await OneSignal.logout();
  } catch (err) {
    console.warn("[onesignal] clearIdentity failed:", err);
  }
}

/**
 * Prompt the browser for push permission and opt the device in.
 * Returns the resulting permission state. Never throws.
 */
export async function promptPush(): Promise<PushPermission> {
  try {
    const ok = await initOneSignal();
    if (!ok) return "unsupported";
    if (!OneSignal.Notifications.isPushSupported()) return "unsupported";
    await OneSignal.Notifications.requestPermission();
    return pushPermission();
  } catch (err) {
    console.warn("[onesignal] promptPush failed:", err);
    return "unsupported";
  }
}

/** Current push permission state for this browser. Never throws. */
export function pushPermission(): PushPermission {
  try {
    if (!APP_ID) return "unsupported";
    if (!ready) {
      // SDK not up yet — fall back to the native Notification API if present.
      if (typeof Notification !== "undefined") return Notification.permission;
      return "unsupported";
    }
    if (!OneSignal.Notifications.isPushSupported()) return "unsupported";
    return OneSignal.Notifications.permissionNative;
  } catch {
    return "unsupported";
  }
}
