import { SKILLS, type Skill } from "./catalog";
import { useSkillsStore } from "@/stores/skills.store";

/** Built-in catalog + user-imported skills (imports shadow same-id builtins). */
export function activeCatalog(): Skill[] {
  const custom = useSkillsStore.getState().custom;
  if (custom.length === 0) return SKILLS;
  const customIds = new Set(custom.map((c) => c.id));
  return [...SKILLS.filter((s) => !customIds.has(s.id)), ...custom];
}

export function skillById(id: string): Skill | undefined {
  return activeCatalog().find((s) => s.id === id);
}

const SKILL_OPEN = "[[kikko-skill:";
const SKILL_CLOSE = "[[/kikko-skill]]";

/**
 * Lightweight synonym expansion (hybrid semantic net, zero-dependency): common
 * intent words map to the catalog's canonical trigger tokens, so "fai muovere"
 * or "effetto fade" still reach the motion skill even without the exact keyword.
 */
const SYNONYMS: Record<string, string[]> = {
  muovere: ["motion", "animazione"],
  muove: ["motion", "animazione"],
  movimento: ["motion", "animazione"],
  animare: ["animazione", "motion"],
  fade: ["animazione", "motion", "transizione"],
  slide: ["animazione", "motion"],
  fluido: ["motion", "smooth"],
  fluida: ["motion", "smooth"],
  scorrimento: ["scroll", "motion"],
  scorrere: ["scroll", "motion"],
  colore: ["colori", "palette", "color"],
  tinta: ["colori", "palette"],
  caratteri: ["tipografia", "font"],
  griglia: ["grid", "layout"],
  impaginazione: ["layout"],
  cellulare: ["mobile", "responsive"],
  telefono: ["mobile", "responsive"],
  vetro: ["glass", "glassmorphism"],
  sfocato: ["glass", "blur"],
  accessibile: ["accessibility", "a11y"],
  contrasto: ["contrast", "a11y"],
};

/** Word-ish tokens from a string, lowercased, length ≥ 3. */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-zà-ú0-9]+/gi) ?? []).filter((w) => w.length >= 3);
}

/** Prompt tokens plus their synonyms. */
function expandTokens(tokens: string[]): Set<string> {
  const set = new Set(tokens);
  for (const t of tokens) {
    const syn = SYNONYMS[t];
    if (syn) for (const s of syn) set.add(s);
  }
  return set;
}

/**
 * Score how well a prompt matches a skill. Keyword hits weigh most; example
 * phrases add a strong signal; description overlap adds a little. A negative
 * keyword hit hard-suppresses the skill (returns 0).
 */
function scoreSkill(
  promptLower: string,
  promptTokens: Set<string>,
  skill: Skill,
): number {
  // Negative keywords: if the user explicitly excludes this, don't fire it.
  for (const nk of skill.negativeKeywords ?? []) {
    if (promptLower.includes(nk.toLowerCase())) return 0;
  }

  let score = 0;
  for (const kw of skill.keywords) {
    const k = kw.toLowerCase();
    if (k.includes(" ")) {
      if (promptLower.includes(k)) score += 3;
    } else if (promptTokens.has(k)) {
      score += 2;
    }
  }
  for (const ph of skill.phrases ?? []) {
    if (promptLower.includes(ph.toLowerCase())) score += 3;
  }
  for (const w of tokenize(skill.description)) {
    if (promptTokens.has(w)) score += 0.25;
  }
  return score;
}

/**
 * Pick the best-matching enabled skills for a prompt. Returns up to `max`
 * skills scoring above a small threshold, best first. Mutually-exclusive skills
 * (via `excludes`) never co-occur — the higher-scored one wins.
 */
export function matchSkills(prompt: string, enabledIds: string[], max = 2): Skill[] {
  const trimmed = prompt.trim();
  if (!trimmed) return [];
  const enabled = new Set(enabledIds);
  const promptLower = trimmed.toLowerCase();
  const promptTokens = expandTokens(tokenize(trimmed));

  const ranked = activeCatalog()
    .filter((s) => enabled.has(s.id))
    .map((s) => ({ skill: s, score: scoreSkill(promptLower, promptTokens, s) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score);

  // Greedy pick honoring mutual exclusion.
  const picked: Skill[] = [];
  for (const cand of ranked) {
    if (picked.length >= max) break;
    const conflict = picked.some(
      (p) =>
        (p.excludes ?? []).includes(cand.skill.id) ||
        (cand.skill.excludes ?? []).includes(p.id),
    );
    if (!conflict) picked.push(cand.skill);
  }
  return picked;
}

/**
 * Resolve a leading slash command (`/motion build a …`) to a forced skill.
 * Accepts an explicit `command`, the skill id, or an exact keyword. Returns the
 * skill and the prompt with the command stripped, or null. Requires text after
 * the command so a lone `/motion` doesn't fire on an empty task.
 */
export function resolveSlash(
  text: string,
  enabledIds: string[],
): { skill: Skill; clean: string } | null {
  const m = text.match(/^\s*\/([a-z0-9-]{2,})\b[ \t]*/i);
  if (!m) return null;
  const token = m[1].toLowerCase();
  const clean = text.slice(m[0].length).trim();
  if (!clean) return null;

  const enabled = new Set(enabledIds);
  const cat = activeCatalog().filter((s) => enabled.has(s.id));
  const skill =
    cat.find((s) => s.command?.toLowerCase() === token) ??
    cat.find((s) => s.id === token || s.id.endsWith(`-${token}`)) ??
    cat.find((s) => s.keywords.some((k) => k.toLowerCase() === token));
  return skill ? { skill, clean } : null;
}

export type PlanSource = "slash" | "match" | "recipe" | "pinned" | "sticky";
export interface PlannedSkill {
  skill: Skill;
  source: PlanSource;
}

/**
 * The full set of skills to apply for a prompt, combining (in priority order):
 * a slash command, keyword/phrase matches, FORCED recipe skills (all of a Studio
 * recipe's hand-picked skills — bypassing the 2-match cap so top-tier briefs get
 * their full playbook stack), user-pinned skills, and still-warm sticky skills.
 * Pure — reads the store but mutates nothing; both the composer preview and the
 * send path use it. `freshIds` are the skills matched THIS turn (slash/keyword),
 * used to refresh stickiness after sending (forced/pinned/sticky excluded).
 */
export function planInjection(
  text: string,
  forcedIds: string[] = [],
): {
  planned: PlannedSkill[];
  clean: string;
  freshIds: string[];
} {
  const store = useSkillsStore.getState();
  const enabled = store.enabled;
  const enabledSet = new Set(enabled);

  const slash = resolveSlash(text, enabled);
  const clean = slash ? slash.clean : text;
  const scored = store.autoApply ? matchSkills(clean, enabled, 2) : [];

  const planned: PlannedSkill[] = [];
  const seen = new Set<string>();
  const add = (skill: Skill | undefined, source: PlanSource) => {
    if (!skill || seen.has(skill.id) || !enabledSet.has(skill.id)) return;
    seen.add(skill.id);
    planned.push({ skill, source });
  };

  if (slash) add(slash.skill, "slash");
  for (const s of scored) add(s, "match");
  const freshIds = planned.map((p) => p.skill.id);

  // Recipe skills are force-injected in full — no cap — so a Studio brief runs
  // its complete expert stack (architecture + style + type + motion + …).
  for (const id of forcedIds) add(skillById(id), "recipe");
  for (const id of store.pinned) add(skillById(id), "pinned");
  for (const [id, turns] of Object.entries(store.sticky)) {
    if (turns > 0) add(skillById(id), "sticky");
  }

  return { planned, clean, freshIds };
}

/**
 * Build the SYSTEM-role text from the matched skills' playbooks. Modern models
 * follow instructions in the system message far more reliably than text mixed
 * into the user's message — so kikkoCode sends the playbooks here and keeps the
 * user prompt clean.
 */
export function buildSkillSystem(skills: Skill[]): string {
  if (skills.length === 0) return "";
  const blocks = skills.map((s) => `## ${s.name}\n${s.body}`).join("\n\n");
  return `Follow these expert design/engineering playbook(s) for this request (they are guidance, not the user's words):\n\n${blocks}`;
}

/**
 * Tag the user text with EMPTY skill markers, purely so the chat UI can show a
 * badge for what was applied (the actual instructions live in the system role
 * now). parseSkills strips these back out.
 */
export function tagSkills(userText: string, skills: Skill[]): string {
  if (skills.length === 0) return userText;
  const tags = skills.map((s) => `${SKILL_OPEN}${s.id}]]${SKILL_CLOSE}`).join("");
  return `${tags}${userText}`;
}

/**
 * Wrap the user's text with the matched skills' instructions (fenced by hidden
 * markers so the UI can strip them and show a badge instead). Retained for the
 * round-trip tests and any caller that still wants inline injection.
 */
export function injectSkills(userText: string, skills: Skill[]): string {
  if (skills.length === 0) return userText;
  const blocks = skills
    .map((s) => `${SKILL_OPEN}${s.id}]]\n${s.body}\n${SKILL_CLOSE}`)
    .join("\n\n");
  const preface =
    "Apply the following expert playbook(s) to this request (guidance, not part of the user's words):";
  return `${preface}\n\n${blocks}\n\n---\n\n${userText}`;
}

/** Strip injected skill blocks from a message, returning clean text + skill ids. */
export function parseSkills(text: string): { clean: string; skillIds: string[] } {
  const ids: string[] = [];
  const re = /\[\[kikko-skill:([a-z0-9-]+)\]\][\s\S]*?\[\[\/kikko-skill\]\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ids.push(m[1]);

  // Hidden policy notes (e.g. the preview/dev-server guidance) are also stripped
  // from what the user sees, but are not skills.
  const noteRe = /\[\[kikko-note\]\][\s\S]*?\[\[\/kikko-note\]\]/g;
  const hasNote = noteRe.test(text);

  if (ids.length === 0 && !hasNote) return { clean: text, skillIds: [] };

  const clean = text
    .replace(re, "")
    .replace(/\[\[kikko-note\]\][\s\S]*?\[\[\/kikko-note\]\]/g, "")
    .replace(/^Apply the following expert playbook\(s\)[^\n]*\n*/, "")
    .replace(/^\s*---\s*\n*/, "")
    .trim();
  return { clean, skillIds: ids };
}
