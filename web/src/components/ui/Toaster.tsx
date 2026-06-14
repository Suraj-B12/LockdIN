/* =====================================================================
   Toaster — Sonner mount, themed to the LockdIN surface system.
   Mounted once at the app root. Call toast() from anywhere (no context needed).
   Never use window.alert — use toast.success / toast.error / toast.message.
   ===================================================================== */
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      gap={10}
      offset={20}
      toastOptions={{
        classNames: {
          toast:
            "!bg-surface-2/95 !text-ink !border !border-hairline/10 !rounded-2xl !backdrop-blur-xl " +
            "!shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_18px_50px_-20px_rgba(0,0,0,0.7)]",
          title: "!text-ink !text-sm !font-medium",
          description: "!text-ink-muted !text-[13px]",
          actionButton: "!bg-teal !text-canvas !rounded-full !text-xs !font-medium",
          cancelButton: "!bg-surface-3 !text-ink-soft !rounded-full !text-xs",
          success: "!text-teal-bright",
          error: "!text-danger",
        },
      }}
      style={
        {
          // sonner reads these CSS vars for its base theming.
          "--normal-bg": "rgb(var(--surface-2))",
          "--normal-text": "rgb(var(--ink))",
          "--normal-border": "rgb(var(--hairline) / 0.1)",
        } as React.CSSProperties
      }
    />
  );
}
