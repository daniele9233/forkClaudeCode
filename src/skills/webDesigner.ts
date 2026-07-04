/**
 * "Web Designer mode" — an always-on directive that makes EVERY web-related
 * prompt (not just Studio recipes) inherit a senior front-end mindset. When
 * enabled in Settings, kikkoCode prepends this to web prompts, fenced by the
 * hidden `[[kikko-note]]` marker so parseSkills strips it from what the user sees.
 */
const NOTE_OPEN = "[[kikko-note]]";
const NOTE_CLOSE = "[[/kikko-note]]";

const DIRECTIVE = `You are operating as a senior front-end design team (as if 30 experts worked on it). For ANY web/UI work, hold this bar without being asked:
- Distinctive by default: never ship generic AI-looking design. Pick a real point of view — a distinctive font pairing (never Inter/Arial/system defaults), one intentional accent color (tinted neutrals, never pure #000/#fff), a signature layout idea repeated with discipline.
- Craft: modular type scale + 8pt spacing, strong visual hierarchy with one focal point per screen, optical alignment, generous whitespace, tinted layered shadows.
- Complete: full state design (hover/focus-visible/active/disabled/loading/empty/error), real content (no lorem ipsum), responsive 360px→ultrawide, WCAG AA, semantic HTML.
- Motion: purposeful micro-interactions (150–250ms ease-out, custom cubic-bezier, no bounce/elastic), always reduced-motion safe.
- Anti-patterns to avoid: overused fonts, gray text on colored backgrounds, everything wrapped/nested in cards, monotonous identical full-width sections.
- When building a site, prefer a real project (Vite + React + TS + Tailwind) with battle-tested components (shadcn/ui + Aceternity/Magic UI) over a lone static HTML file, unless the user asks otherwise.
Self-review before finishing: "what makes this look templated?" — and fix it.`;

const KEYWORDS = [
  "sito",
  "site",
  "website",
  "web ",
  "webpage",
  "pagina",
  " page",
  "html",
  "css",
  "react",
  "vue",
  "svelte",
  "next",
  "vite",
  "astro",
  "tailwind",
  "landing",
  "frontend",
  "front-end",
  "ui",
  "ux",
  "design",
  "component",
  "componenti",
  "hero",
  "layout",
];

/** Prepend the web-designer directive when enabled and the prompt looks web-related. */
export function injectWebDesigner(text: string, enabled: boolean): string {
  if (!enabled) return text;
  const lower = text.toLowerCase();
  if (!KEYWORDS.some((k) => lower.includes(k))) return text;
  return `${NOTE_OPEN}\n${DIRECTIVE}\n${NOTE_CLOSE}\n\n${text}`;
}
