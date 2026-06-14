/* =====================================================================
   Placeholder — a composed "coming together" view for routes other agents
   will build. NOT an empty white page: it shows the eyebrow + display title +
   the double-bezel card, so in-progress screens still read as intentional.
   ===================================================================== */
import type { Icon } from "@phosphor-icons/react";
import { Card, EyebrowTag } from "@/components/ui";
import { Reveal } from "@/components/ui";

export interface PlaceholderProps {
  eyebrow: string;
  title: string;
  description: string;
  icon: Icon;
}

export function Placeholder({ eyebrow, title, description, icon: IconCmp }: PlaceholderProps) {
  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <Reveal className="mx-auto max-w-xl">
        <Card tone="teal" className="text-center">
          <div className="flex flex-col items-center gap-5 px-2 py-10 sm:px-8">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal/12 text-teal-bright ring-1 ring-inset ring-teal/20">
              <IconCmp weight="duotone" className="h-7 w-7" />
            </span>
            <EyebrowTag>{eyebrow}</EyebrowTag>
            <h1 className="font-display text-3xl tracking-tightest text-ink sm:text-4xl">{title}</h1>
            <p className="max-w-md text-pretty text-sm leading-relaxed text-ink-muted">
              {description}
            </p>
            <p className="mt-2 text-xs text-ink-faint">
              This screen is part of the next build phase. The foundation, tokens, and primitives
              are ready for it.
            </p>
          </div>
        </Card>
      </Reveal>
    </div>
  );
}
