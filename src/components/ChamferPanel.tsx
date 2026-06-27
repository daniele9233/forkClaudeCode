import { cn } from "@/lib/utils";

interface ChamferPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Chamfer size in px. */
  notch?: number;
  /** Which corner to bevel ("tr" = top-right, points toward the interior). */
  corner?: "tr" | "tl";
  /** Stronger frost (for floating overlays/modals). */
  strong?: boolean;
  /** Layout classes for the outer (sized) element. */
  className?: string;
  /** Classes for the inner content surface (padding, etc.). */
  innerClassName?: string;
  children: React.ReactNode;
}

/**
 * A frosted-glass panel with a single chamfered corner — the signature motif.
 *
 * Two-layer technique: the outer element is the hairline border colour and is
 * clipped; the inner glass surface sits 1px inside with the same clip, so the
 * border traces every edge *including* the diagonal (a plain CSS border can't).
 */
export function ChamferPanel({
  notch = 18,
  corner = "tr",
  strong = false,
  className,
  innerClassName,
  children,
  ...rest
}: ChamferPanelProps) {
  const clip = corner === "tr" ? "notch-tr" : "notch-tl";
  const style = { ["--notch" as string]: `${notch}px` } as React.CSSProperties;
  return (
    <div className={cn(clip, "bg-white/[0.08] p-px", className)} style={style} {...rest}>
      <div
        className={cn(
          clip,
          strong ? "glass-strong" : "glass",
          "h-full w-full",
          innerClassName,
        )}
        style={style}
      >
        {children}
      </div>
    </div>
  );
}
