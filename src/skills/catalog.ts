/**
 * Bundled "skills" — reusable expert playbooks the agent applies automatically.
 *
 * A skill is just instructions + a natural-language trigger. When your prompt
 * matches a skill's `description`/`keywords`, kikkoCode injects the skill's
 * `body` into the request so the agent follows it — you describe the goal, not
 * the skill name. Content is curated from today's top-starred design/animation
 * projects (Motion/Framer, GSAP, Aceternity UI, Magic UI, React Bits, shadcn/ui,
 * Lenis, Tailwind).
 */
export interface Skill {
  id: string;
  name: string;
  emoji: string;
  /** Natural-language "use when…" trigger the matcher reads. */
  description: string;
  /** Extra trigger words to catch intent (IT + EN). */
  keywords: string[];
  /** The expert instructions injected into the prompt when this skill fires. */
  body: string;
  /** Optional credit / inspiration. */
  source?: string;
}

export const SKILLS: Skill[] = [
  {
    id: "uiux-pro-max",
    name: "UI/UX Pro Max",
    emoji: "✨",
    description:
      "Use when the user wants a beautiful, high-end, production-grade UI/UX — “make it stunning/premium/impeccable”, senior-level design polish.",
    keywords: [
      "bello",
      "bellissimo",
      "stupendo",
      "premium",
      "impeccabile",
      "elegante",
      "design",
      "ui",
      "ux",
      "pro",
      "beautiful",
      "stunning",
      "gorgeous",
      "polished",
      "pixel",
    ],
    body: [
      "Act as a senior product designer + front-end engineer. Deliver a design that feels premium, not generic:",
      "- Visual hierarchy: one clear focal point per screen; guide the eye with size, weight, contrast and whitespace.",
      "- Type: a modular scale (e.g. 1.25 ratio), max 2 families, tight headings, relaxed body (line-height ~1.6), balanced measure (~65ch).",
      "- Spacing: an 8pt system; generous, consistent padding; align to a grid.",
      "- Color: a restrained palette (1 accent), proper contrast (WCAG AA), tasteful use of subtle gradients/shadows.",
      "- State design: hover, focus-visible, active, disabled, loading, empty and error states for EVERY interactive element.",
      "- Motion: purposeful micro-interactions (150–250ms, ease-out); always honor prefers-reduced-motion.",
      "- Details: rounded consistency, optical alignment, real content (no lorem), responsive from 360px up.",
      "Ship cohesive, restrained, confident design — remove anything that doesn't earn its place.",
    ].join("\n"),
    source: "shadcn/ui, Vercel/Geist design principles",
  },
  {
    id: "hero-page",
    name: "Hero Section",
    emoji: "🦸",
    description:
      "Use when the user wants a striking landing hero / above-the-fold section with high visual impact (aurora, spotlight, animated gradient, big headline).",
    keywords: [
      "hero",
      "landing",
      "above the fold",
      "header",
      "copertina",
      "sezione principale",
      "headline",
      "cta",
    ],
    body: [
      "Design a high-impact hero (above the fold) like the best Aceternity UI / Magic UI landing pages:",
      "- Structure: eyebrow tag → bold headline (with a gradient or highlighted keyword) → concise subhead → primary + secondary CTA → trust strip.",
      "- Background drama (pick ONE, tasteful): animated aurora/gradient mesh, spotlight that follows the cursor, subtle grid + radial glow, or dotted noise.",
      "- Depth: layered blur, soft shadows, a floating product mock or bento preview.",
      "- Motion: staggered entrance (fade + rise), gradient shift, CTA shimmer on hover. Keep it 60fps and reduced-motion safe.",
      "- Copy: outcome-focused headline, one crisp value sentence. Big type (clamp() for fluid sizing).",
      "- Accessibility: real heading levels, foculable CTAs, contrast over busy backgrounds via an overlay.",
    ].join("\n"),
    source: "Aceternity UI, Magic UI",
  },
  {
    id: "gsap-motion",
    name: "GSAP Motion",
    emoji: "🎬",
    description:
      "Use when the user wants advanced scroll-driven animation, timelines, pinning, SVG morphing, or cinematic storytelling on the web.",
    keywords: [
      "gsap",
      "scroll",
      "scrolltrigger",
      "timeline",
      "parallax",
      "pin",
      "animazione scroll",
      "cinematic",
      "svg",
      "morph",
    ],
    body: [
      "Use GSAP (GreenSock) for bulletproof, high-performance motion:",
      "- Prefer a gsap.timeline() for sequences; use ScrollTrigger for scroll-driven reveals, pinning and scrubbing.",
      "- Batch reveals with ScrollTrigger.batch; use `once: true` for one-shot entrances.",
      "- Pin + scrub sections for storytelling; snap between panels for a guided feel.",
      "- Animate transforms/opacity only (GPU-friendly); avoid layout-thrashing properties.",
      "- Pair with Lenis for smooth scroll; sync via lenis.on('scroll', ScrollTrigger.update).",
      "- Clean up in a gsap.context()/ctx.revert() (or useGSAP) to avoid leaks in React.",
      "- Respect prefers-reduced-motion: skip or shorten timelines.",
    ].join("\n"),
    source: "GSAP + ScrollTrigger, Lenis",
  },
  {
    id: "motion-react",
    name: "Motion (React)",
    emoji: "🌀",
    description:
      "Use when the user wants declarative React animations: layout animations, gestures, shared-element transitions, spring physics (Motion / Framer Motion).",
    keywords: [
      "framer",
      "motion",
      "layout animation",
      "gesture",
      "spring",
      "animazione react",
      "transition",
      "variants",
      "animate presence",
    ],
    body: [
      "Use Motion (formerly Framer Motion) for declarative React animation:",
      "- Compose with `variants` + `staggerChildren` for orchestrated reveals.",
      "- Use `layout` and `layoutId` for magic-move / shared-element transitions.",
      "- `AnimatePresence` for enter/exit; `whileHover`/`whileTap`/`whileInView` for interactions.",
      "- Prefer springs (stiffness/damping) over fixed durations for natural feel.",
      "- Use the `useReducedMotion()` hook to disable non-essential motion.",
      "- Keep animations on transform/opacity; wrap heavy lists with `will-change` sparingly.",
    ].join("\n"),
    source: "Motion (Framer Motion)",
  },
  {
    id: "aceternity-magic",
    name: "Aceternity / Magic UI",
    emoji: "🪄",
    description:
      "Use when the user wants ready-made high-impact components (animated beams, marquees, bento, sparkles, gradient cards) on top of shadcn/ui + Tailwind.",
    keywords: [
      "aceternity",
      "magic ui",
      "component",
      "componenti",
      "shadcn",
      "beam",
      "marquee",
      "sparkles",
      "gradient card",
      "react bits",
    ],
    body: [
      "Build with the modern component stack (shadcn/ui + Tailwind + Motion), in the spirit of Aceternity UI / Magic UI / React Bits:",
      "- Start from shadcn/ui primitives for accessibility, then layer signature effects: animated gradient borders, spotlight/border beams, marquees, sparkles, meteor/aurora backgrounds.",
      "- Keep effects composable and reduced-motion aware; expose props for intensity.",
      "- Use Tailwind design tokens (CSS variables) so effects theme automatically (dark/light).",
      "- Don't overdo it: one signature effect per section; performance first (transform/opacity).",
    ].join("\n"),
    source: "Aceternity UI, Magic UI, React Bits (~37k★)",
  },
  {
    id: "micro-interactions",
    name: "Micro-interactions",
    emoji: "🫧",
    description:
      "Use when the user wants delightful hover/press/focus feedback, button and input micro-interactions, tactile spring feedback.",
    keywords: [
      "micro",
      "interaction",
      "interazioni",
      "hover",
      "press",
      "feedback",
      "tactile",
      "button",
      "ripple",
      "haptic",
    ],
    body: [
      "Add micro-interactions that make the UI feel alive and responsive:",
      "- Buttons: subtle scale (0.97) on press, glow/shimmer on hover, spinner + disabled on async.",
      "- Inputs: smooth focus ring, floating labels, inline validation with gentle shake on error.",
      "- Feedback: optimistic UI, skeletons over spinners, toasts that slide + auto-dismiss.",
      "- Timing: 120–200ms, ease-out; springs for anything that 'moves'.",
      "- Keep them subtle and consistent; never block the user. Honor reduced-motion.",
    ].join("\n"),
  },
  {
    id: "glass-aurora",
    name: "Glass & Aurora",
    emoji: "🌌",
    description:
      "Use when the user wants a glassmorphism / aurora / gradient-glow aesthetic — frosted panels, glow, mesh gradients, done tastefully.",
    keywords: [
      "glass",
      "glassmorphism",
      "aurora",
      "gradient",
      "glow",
      "vetro",
      "sfumato",
      "mesh",
      "blur",
      "neon",
    ],
    body: [
      "Craft a tasteful glass/aurora aesthetic (avoid the muddy, overdone look):",
      "- Glass: backdrop-blur + low-alpha background + a 1px hairline top-border for the light edge; keep contrast readable.",
      "- Aurora: soft animated mesh gradients (2–3 hues) drifting slowly behind content; low opacity + blur.",
      "- Glow: colored box-shadow/`drop-shadow` on focal elements; restraint over saturation.",
      "- Layer on a near-black or deep-tinted base; ensure text stays AA-legible (overlay if needed).",
      "- Performance: animate gradients with transforms; avoid animating filter/blur on large areas.",
    ].join("\n"),
  },
  {
    id: "bento-grid",
    name: "Bento Grid",
    emoji: "🍱",
    description:
      "Use when the user wants a modern bento-grid layout — asymmetric feature cards of varying sizes, like Apple/Vercel feature sections.",
    keywords: [
      "bento",
      "grid",
      "griglia",
      "cards",
      "feature section",
      "dashboard layout",
      "masonry",
    ],
    body: [
      "Compose a modern bento grid:",
      "- CSS grid with spanning cells (grid-template + col/row-span) for asymmetric, varied-size cards.",
      "- Each cell = one idea: icon/visual + short title + supporting line; largest cell = hero feature.",
      "- Consistent radius, gap and inner padding; subtle hover lift + border highlight.",
      "- Put a small live/animated preview in the biggest tiles for interest.",
      "- Responsive: collapse to 1–2 columns on mobile while keeping rhythm.",
    ].join("\n"),
    source: "Apple / Vercel feature layouts",
  },
  {
    id: "smooth-scroll",
    name: "Smooth Scroll Story",
    emoji: "📜",
    description:
      "Use when the user wants buttery smooth scrolling and scroll-driven storytelling / reveals down a long page.",
    keywords: [
      "smooth scroll",
      "lenis",
      "scroll story",
      "scrollytelling",
      "reveal",
      "parallax",
      "scorrimento fluido",
    ],
    body: [
      "Build smooth, scroll-driven storytelling:",
      "- Use Lenis for inertial smooth scroll; keep it accessible (respect reduced-motion, don't hijack focus).",
      "- Reveal sections on enter (fade + rise, staggered); use IntersectionObserver or ScrollTrigger.",
      "- Parallax layers subtly (small translate ranges); pin key moments for emphasis.",
      "- Add a scroll progress indicator; keep 60fps by animating transforms only.",
    ].join("\n"),
    source: "Lenis, GSAP ScrollTrigger",
  },
  {
    id: "a11y-guardian",
    name: "Accessibility Guardian",
    emoji: "♿",
    description:
      "Use when the user wants accessible, inclusive UI — WCAG, keyboard navigation, screen readers, focus management, reduced motion.",
    keywords: [
      "accessibility",
      "accessibile",
      "a11y",
      "wcag",
      "screen reader",
      "keyboard",
      "tastiera",
      "focus",
      "aria",
      "contrast",
    ],
    body: [
      "Make it accessible by default (WCAG 2.2 AA):",
      "- Semantic HTML first (nav/main/button/label); ARIA only to fill gaps.",
      "- Full keyboard support: logical tab order, visible focus-visible rings, escape/enter/arrow handling, focus traps in modals.",
      "- Contrast AA (4.5:1 text); don't rely on color alone; label every control.",
      "- Respect prefers-reduced-motion and prefers-color-scheme.",
      "- Announce async changes with aria-live; alt text for meaningful images.",
    ].join("\n"),
  },
  {
    id: "design-system",
    name: "Design System",
    emoji: "🧩",
    description:
      "Use when the user wants a consistent, tokenized design system — CSS variables, Tailwind theme, reusable components, dark/light.",
    keywords: [
      "design system",
      "tokens",
      "theme",
      "tema",
      "variabili",
      "consistente",
      "component library",
      "tailwind",
    ],
    body: [
      "Establish a tokenized design system:",
      "- Define semantic tokens as CSS variables (color, spacing, radius, shadow, typography) and theme dark/light by swapping vars.",
      "- Wire tokens into Tailwind (CSS-first `@theme`) so utilities stay consistent.",
      "- Build a small set of composable primitives (Button, Card, Input, Panel) with variants (cva/tailwind-variants).",
      "- One source of truth: no magic numbers in components; everything references a token.",
      "- Document states + usage; keep the surface small and coherent.",
    ].join("\n"),
    source: "shadcn/ui, Tailwind v4 CSS-first",
  },
  {
    id: "responsive-master",
    name: "Responsive Master",
    emoji: "📱",
    description:
      "Use when the user wants flawless responsive / mobile-first layouts that adapt from phones to ultrawide.",
    keywords: [
      "responsive",
      "mobile",
      "mobile-first",
      "breakpoint",
      "adattivo",
      "fluid",
      "clamp",
      "container query",
    ],
    body: [
      "Deliver a flawless responsive layout, mobile-first:",
      "- Design from 360px up; enhance at breakpoints, don't cram desktop into mobile.",
      "- Fluid type/space with clamp(); use container queries for component-level responsiveness.",
      "- Grid/flex that reflow gracefully; tap targets ≥44px; avoid horizontal scroll.",
      "- Test 360 / 768 / 1024 / 1440 / ultrawide; respect safe-area insets on mobile.",
    ].join("\n"),
  },
];

export function skillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}
