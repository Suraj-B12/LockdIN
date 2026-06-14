/* =====================================================================
   Input + Textarea — label ABOVE, helper/error BELOW (never placeholder-as-label).
   Hairline ring that lights teal on focus. Error tone is inline, not a toast.
   ===================================================================== */
import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface FieldShellProps {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  id: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ label, helper, error, id, children, className }: FieldShellProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={id} className="text-[13px] font-medium text-ink-soft">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : helper ? (
        <p className="text-xs text-ink-faint">{helper}</p>
      ) : null}
    </div>
  );
}

const fieldBase =
  "w-full rounded-xl bg-surface-2/70 px-4 text-sm text-ink ring-1 ring-inset ring-hairline/10 " +
  "placeholder:text-ink-faint shadow-inset-top transition-[box-shadow,background-color] duration-200 ease-out " +
  "focus:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-teal/55";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, helper, error, className, wrapperClassName, id, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      label={label}
      helper={helper}
      error={error}
      id={fieldId}
      className={wrapperClassName}
    >
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={!!error}
        className={cn(fieldBase, "h-11", error && "ring-danger/50 focus:ring-danger/60", className)}
        {...props}
      />
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  helper?: ReactNode;
  error?: ReactNode;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, helper, error, className, wrapperClassName, id, rows = 4, ...props },
  ref
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <FieldShell
      label={label}
      helper={helper}
      error={error}
      id={fieldId}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={!!error}
        className={cn(
          fieldBase,
          "resize-none py-3 leading-relaxed",
          error && "ring-danger/50 focus:ring-danger/60",
          className
        )}
        {...props}
      />
    </FieldShell>
  );
});
