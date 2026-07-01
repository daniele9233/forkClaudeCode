import { SKILLS, skillById, type Skill } from "./catalog";

const SKILL_OPEN = "[[kikko-skill:";
const SKILL_CLOSE = "[[/kikko-skill]]";

/** Word-ish tokens from a string, lowercased, length ≥ 3. */
function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-zà-ú0-9]+/gi) ?? []).filter((w) => w.length >= 3);
}

/**
 * Score how well a prompt matches a skill. Keyword hits weigh most; overlap with
 * the description adds a little. Multi-word keywords (e.g. "smooth scroll") are
 * matched as substrings.
 */
function scoreSkill(
  promptLower: string,
  promptTokens: Set<string>,
  skill: Skill,
): number {
  let score = 0;
  for (const kw of skill.keywords) {
    const k = kw.toLowerCase();
    if (k.includes(" ")) {
      if (promptLower.includes(k)) score += 3;
    } else if (promptTokens.has(k)) {
      score += 2;
    }
  }
  for (const w of tokenize(skill.description)) {
    if (promptTokens.has(w)) score += 0.25;
  }
  return score;
}

/**
 * Pick the best-matching enabled skills for a prompt. Returns up to `max`
 * skills scoring above a small threshold, best first.
 */
export function matchSkills(prompt: string, enabledIds: string[], max = 2): Skill[] {
  const trimmed = prompt.trim();
  if (!trimmed) return [];
  const enabled = new Set(enabledIds);
  const promptLower = trimmed.toLowerCase();
  const promptTokens = new Set(tokenize(trimmed));

  return SKILLS.filter((s) => enabled.has(s.id))
    .map((s) => ({ skill: s, score: scoreSkill(promptLower, promptTokens, s) }))
    .filter((x) => x.score >= 2)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((x) => x.skill);
}

/**
 * Wrap the user's text with the matched skills' instructions (fenced by hidden
 * markers so the UI can strip them and show a badge instead).
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

export { skillById };
