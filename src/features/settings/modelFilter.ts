/**
 * Curated Anthropic model list.
 *
 * The engine's catalog (via models.dev) exposes every historical Claude point
 * release plus "(latest)" aliases and "Fast" runtime variants — a long, noisy
 * list. kikkoCode shows only Anthropic's **current** lineup, mirroring Claude's
 * own model picker. Update this when Anthropic ships new models (a new app
 * release ships the change; the in-app updater delivers it).
 *
 * Matching is done on the model id with separators stripped, so it's robust to
 * dash/dot/date variations (e.g. `claude-opus-4-8`, `claude-opus-4.8`,
 * `claude-opus-4-8-20260101` all match `opus48`).
 */
export const ANTHROPIC_CURRENT_MODELS = [
  "opus48",
  "opus47",
  "opus46",
  "sonnet5",
  "sonnet46",
  "haiku45",
  "fable5",
] as const;

/** Normalise a model id for matching: lowercase, alphanumerics only. */
function normalizeId(id: string): string {
  return id.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Is this Anthropic model part of the current, curated lineup? Excludes the
 * "Fast" variants and "(latest)" aliases, then keeps only the allow-listed
 * family/version combos.
 */
export function isCurrentAnthropicModel(id: string, name = ""): boolean {
  if (/fast|latest/i.test(id) || /fast|latest/i.test(name)) return false;
  const norm = normalizeId(id);
  return ANTHROPIC_CURRENT_MODELS.some((p) => norm.includes(p));
}

/**
 * Is this GLM (z.ai) model part of the current, worth-using lineup? The z.ai
 * OpenAI-compatible endpoint advertises its whole catalog (~20 entries: GLM-4.5,
 * 4.5V, 4.7-FlashX, 5.1, EV-Turbo, …), which floods the picker. Keep only the
 * current families — the 4.6 line (incl. the 4.6V vision model) and 5.2 — so the
 * list reads cleanly. The selected model always stays visible regardless (the
 * caller keeps the active selection before applying this).
 */
export function isCurrentGlmModel(id: string, name = ""): boolean {
  const hay = `${id} ${name}`;
  return /(^|[^0-9.])(4\.6|5\.2)/.test(hay);
}
