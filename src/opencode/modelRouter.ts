import type { ModelRole } from "@/stores/model.store";

/**
 * Prompt classifier for model auto-routing: DESIGN work (front-end, UI, visual,
 * motion — where a multimodal/Claude model shines) vs CODING (everything else:
 * logic, backend, fixes, scripts — where a fast coder like glm/deepseek is the
 * economical choice). Deliberately simple and transparent: keyword scoring over
 * IT+EN vocabularies; a Studio recipe (forced skills) is always design.
 */
const DESIGN_WORDS = [
  // what is being built
  "sito",
  "website",
  "landing",
  "homepage",
  "portfolio",
  "hero",
  "pagina",
  "page",
  "front-end",
  "frontend",
  "ui",
  "ux",
  "interfaccia",
  "componente",
  "component",
  "web app",
  "webapp",
  // visual language
  "design",
  "stile",
  "style",
  "layout",
  "palette",
  "colore",
  "color",
  "font",
  "tipografia",
  "typography",
  "grafica",
  "bello",
  "bellissimo",
  "premium",
  "awwwards",
  "figma",
  // motion / 3d
  "anima",
  "animation",
  "animazione",
  "motion",
  "3d",
  "webgl",
  "three",
  "shader",
  "gsap",
  "scroll",
  "parallax",
  "transizione",
  "transition",
  // css & co.
  "css",
  "tailwind",
  "responsive",
  "dark mode",
  "tema",
] as const;

const CODING_WORDS = [
  "bug",
  "fix",
  "errore",
  "error",
  "crash",
  "test",
  "refactor",
  "api",
  "endpoint",
  "backend",
  "database",
  "db",
  "sql",
  "auth",
  "login",
  "server",
  "script",
  "cli",
  "deploy",
  "docker",
  "k8s",
  "kubernetes",
  "funzione",
  "function",
  "algoritmo",
  "algorithm",
  "regex",
  "parse",
  "tipo",
  "types",
  "typescript",
  "python",
  "rust",
  "installa",
  "install",
  "dipendenz",
  "dependency",
  "config",
  "log",
] as const;

function score(text: string, words: readonly string[]): number {
  let n = 0;
  for (const w of words) if (text.includes(w)) n++;
  return n;
}

/**
 * Classify a prompt for routing. `forcedSkillIds` (a Studio recipe's stack)
 * always means design — every recipe is a front-end brief.
 */
export function classifyPrompt(text: string, forcedSkillIds?: string[]): ModelRole {
  if (forcedSkillIds && forcedSkillIds.length > 0) return "design";
  const t = text.toLowerCase();
  const design = score(t, DESIGN_WORDS);
  const coding = score(t, CODING_WORDS);
  // Ties (and no signal at all) go to coding — the cheaper default; design
  // must be positively indicated.
  return design > coding ? "design" : "coding";
}
