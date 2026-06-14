/* =====================================================================
   PublicLayout — shell for the marketing surfaces (currently just the landing
   page, which renders its own nav for full hero control). This thin layout is
   kept for future public routes (about, privacy, terms) and renders ambient
   backdrop + grain + an <Outlet>.
   ===================================================================== */
import { Outlet } from "react-router-dom";
import { BackgroundOrbs } from "@/components/ui";

export function PublicLayout() {
  return (
    <div className="relative min-h-[100dvh] bg-canvas">
      <BackgroundOrbs />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  );
}
