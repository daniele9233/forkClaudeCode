import { cn } from "@/lib/utils";

/**
 * Blueprint panel — a frosted-glass rectangle with a hairline border.
 * Pair it with <PanelTab> for the signature notched header.
 */
export function Panel({
  className,
  strong,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { strong?: boolean }) {
  return (
    <div
      className={cn(
        strong ? "glass-strong" : "glass",
        "border border-[var(--border)]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * Notched header tab cut into the top of a Panel (style-D signature).
 * Place as the panel's first child. `right` renders a trailing element
 * (e.g. a count or diff stat) inside the same tab.
 */
export function PanelTab({
  children,
  right,
  className,
}: {
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bp-tab", className)}>
      <span>{children}</span>
      {right && <span className="opacity-80">{right}</span>}
    </div>
  );
}
