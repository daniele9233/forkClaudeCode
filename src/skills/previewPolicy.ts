/**
 * A hidden guidance note injected into web-related prompts. kikkoCode owns the
 * preview and dev server (see DevRunner), so the agent must not spawn detached
 * dev servers or open the system browser — otherwise its output escapes our
 * capture and the in-app preview can't find it. Stripped from the visible
 * message by parseSkills (the `[[kikko-note]]` marker).
 */
const NOTE_OPEN = "[[kikko-note]]";
const NOTE_CLOSE = "[[/kikko-note]]";

const POLICY = `Environment note (kikkoCode): the app manages the web preview and dev server for the user. When you build or change a web project, do NOT start a long-running dev server in a detached window (no PowerShell Start-Process, no separate terminal) and do NOT open the system browser. Just make the changes and say the page/app is ready — kikkoCode starts the dev server itself and shows the live preview in-app automatically. If you truly need to run a server, run it as a normal foreground/background shell command so its output is visible, never detached.`;

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
  "anteprima",
  "preview",
  "dev server",
  "npm run",
  "pnpm",
  "localhost",
];

/** Prepend the policy note when the prompt looks web/preview-related. */
export function injectPreviewPolicy(text: string): string {
  const lower = text.toLowerCase();
  if (!KEYWORDS.some((k) => lower.includes(k))) return text;
  return `${NOTE_OPEN}\n${POLICY}\n${NOTE_CLOSE}\n\n${text}`;
}

/** The raw policy for SYSTEM-role injection, or null when not web-related. */
export function previewPolicyNote(text: string): string | null {
  const lower = text.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k)) ? POLICY : null;
}
