/**
 * Curated catalog of REAL, installable engine skills (git repos with
 * `skills/<name>/SKILL.md` folders). Unlike the built-in design *playbooks*
 * (`catalog.ts`, injected into the prompt), these are proper OpenCode/Claude
 * skills: the installer clones the repo and drops each skill folder into
 * `~/.claude/skills`, so the engine exposes them as invocable skills.
 *
 * Focused on design / front-end / motion — the toolkit to build sites that can
 * compete on awwwards — plus two high-quality general packs.
 */
export interface SkillPack {
  id: string;
  name: string;
  emoji: string;
  /** Public git repo cloned on install. */
  repo: string;
  /** What you get. */
  description: string;
  /** Rough skill count / contents hint (shown on the card). */
  count: string;
  tags: string[];
  /** Highlight design/front-end packs first. */
  featured?: boolean;
}

export const SKILL_PACKS: SkillPack[] = [
  {
    id: "taste-skill",
    name: "Taste (design front-end)",
    emoji: "🎯",
    repo: "https://github.com/Leonxlnx/taste-skill",
    description:
      "13 skill di gusto/design anti-slop: taste, redesign, brutalist, minimalist, soft, brandkit, image-to-code, imagegen web/mobile, stitch…",
    count: "13 skill",
    tags: ["design", "frontend", "taste", "awwwards"],
    featured: true,
  },
  {
    id: "impeccable",
    name: "Impeccable",
    emoji: "💎",
    repo: "https://github.com/pbakaus/impeccable",
    description:
      "La skill 'impeccable' per un gusto front-end impeccabile: gerarchia, spaziatura, tipografia, dettagli — output che sembra fatto da un designer.",
    count: "1 skill",
    tags: ["design", "frontend", "polish"],
    featured: true,
  },
  {
    id: "ui-ux-pro-max",
    name: "UI/UX Pro Max",
    emoji: "🎨",
    repo: "https://github.com/nextlevelbuilder/ui-ux-pro-max-skill",
    description:
      "Suite UI/UX: design, design-system, brand, ui-styling, banner, slides — per interfacce curate e coerenti.",
    count: "~7 skill",
    tags: ["design", "ui", "ux", "design-system"],
    featured: true,
  },
  {
    id: "gsap-skills",
    name: "GSAP (animazioni)",
    emoji: "🎬",
    repo: "https://github.com/greensock/gsap-skills",
    description:
      "Pacchetto ufficiale GreenSock: gsap-core, timeline, scrolltrigger, react, frameworks, plugins, performance, utils — animazioni da awwwards.",
    count: "8 skill",
    tags: ["motion", "animation", "gsap", "awwwards"],
    featured: true,
  },
  {
    id: "remotion",
    name: "Remotion (video)",
    emoji: "📹",
    repo: "https://github.com/remotion-dev/skills",
    description:
      "Skill ufficiale Remotion: creare video programmatici in React (intro, motion graphics, export).",
    count: "1 skill",
    tags: ["video", "motion", "react"],
    featured: true,
  },
  {
    id: "anthropic-skills",
    name: "Anthropic (ufficiali)",
    emoji: "🅰️",
    repo: "https://github.com/anthropics/skills",
    description:
      "Pacchetto ufficiale Anthropic (18): canvas-design, brand-guidelines, algorithmic-art, theme-factory, web-artifacts-builder, webapp-testing, docx/pptx/xlsx…",
    count: "18 skill",
    tags: ["design", "official", "docs", "art"],
  },
  {
    id: "superpowers",
    name: "Superpowers (workflow)",
    emoji: "⚡",
    repo: "https://github.com/obra/superpowers",
    description:
      "14 skill di metodo: brainstorming, writing/executing plans, code review, verification-before-completion, subagent-driven-development, git worktrees…",
    count: "14 skill",
    tags: ["workflow", "planning", "review"],
  },
];
