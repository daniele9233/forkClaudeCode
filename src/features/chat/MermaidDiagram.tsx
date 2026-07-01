import { useEffect, useRef, useState } from "react";
import type { Mermaid } from "mermaid";

// Lazy-load mermaid (it's heavy) so it's code-split out of the main bundle and
// only fetched the first time a diagram actually appears.
let mermaidPromise: Promise<Mermaid> | null = null;
function loadMermaid(): Promise<Mermaid> {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => {
      const mermaid = m.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        // Content comes from the model, so sanitize aggressively.
        securityLevel: "strict",
        fontFamily: "inherit",
        themeVariables: {
          background: "transparent",
          primaryColor: "#1a1d21",
          primaryBorderColor: "#e7a93c",
          lineColor: "#6b7280",
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

let counter = 0;

/**
 * Render a mermaid diagram. Tolerant of incomplete input (e.g. while a fenced
 * block is still streaming): it keeps the last successfully rendered SVG and
 * only shows the raw source as a fallback until the diagram first parses.
 */
export function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const idRef = useRef(`mmd-${(counter += 1)}`);

  useEffect(() => {
    let cancelled = false;
    const src = code.trim();
    if (!src) {
      setSvg(null);
      return;
    }
    loadMermaid()
      .then((mermaid) =>
        mermaid.parse(src).then(() => mermaid.render(idRef.current, src)),
      )
      .then(({ svg }) => {
        if (!cancelled) setSvg(svg);
      })
      .catch(() => {
        /* incomplete or invalid — keep the last good render (if any) */
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (svg) {
    return (
      <div
        className="my-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--color-forge-950)] p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
        // mermaid renders trusted-ish SVG (securityLevel: strict sanitizes it)
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );
  }

  // Not yet renderable (still streaming / invalid) — show the source.
  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--color-forge-950)] p-3 text-xs">
      <code className="font-mono text-[var(--muted-foreground)]">{code}</code>
    </pre>
  );
}
