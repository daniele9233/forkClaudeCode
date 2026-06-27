import { cn } from "@/lib/utils";

/**
 * Registration / crop-mark corner brackets (the L-shaped ticks in the
 * reference HUD). Render inside a `relative` container; absolutely positioned.
 */
export function CornerBrackets({
  className,
  size = 16,
  inset = 0,
}: {
  className?: string;
  size?: number;
  inset?: number;
}) {
  const common = "absolute border-[var(--muted-foreground)]/40";
  const s = `${size}px`;
  const i = `${inset}px`;
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0", className)}>
      <span
        className={cn(common, "border-l border-t")}
        style={{ width: s, height: s, top: i, left: i }}
      />
      <span
        className={cn(common, "border-r border-t")}
        style={{ width: s, height: s, top: i, right: i }}
      />
      <span
        className={cn(common, "border-l border-b")}
        style={{ width: s, height: s, bottom: i, left: i }}
      />
      <span
        className={cn(common, "border-r border-b")}
        style={{ width: s, height: s, bottom: i, right: i }}
      />
    </div>
  );
}
