/**
 * cn — tiny className combiner. Joins truthy class fragments with spaces.
 * Avoids pulling in clsx/tailwind-merge for the foundation; if class-conflict
 * resolution becomes necessary later, swap this for tailwind-merge.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}
