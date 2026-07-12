/**
 * Studio recipes — a small, curated set of 5 IMPECCABLE "design briefs" that
 * turn kikkoCode into a senior front-end team. Fewer, perfect recipes beat a
 * long noisy list. Each pairs a visual STYLE with a page LAYOUT, force-injects
 * the right skill stack (always incl. `taste`, the anti-slop framework), and
 * expands into a rich, self-contained prompt with the anti-slop bar baked in.
 *
 * Every brief scaffolds a REAL full front-end project (Vite + React + TS +
 * modern animation/3D stack), never a lone static index.html.
 *
 * The prompts are written in Italian (the user's language) but keep the English
 * design/tech terms so the skill matcher and the model both recognize the intent.
 */
export interface WebsiteRecipe {
  id: string;
  name: string;
  emoji: string;
  /** Visual style label (shown on the card). */
  style: string;
  /** Layout label (shown on the card). */
  layout: string;
  /** One-line pitch of what you get. */
  description: string;
  /** Accent color for the card's tint/gradient (hex). */
  accent: string;
  /** Skills this recipe leans on (for the "uses" chips). */
  skillIds: string[];
  /**
   * Grouping in the Studio tab. "style" = design-language starters;
   * "enterprise" = full, sellable, industry-specific websites. Defaults to
   * "style" when omitted.
   */
  category?: "style" | "enterprise";
  /** The full brief dropped into the composer on click. */
  prompt: string;
}

/**
 * Extra hard requirements appended ONLY to enterprise briefs — the bar that
 * makes the result a real, sellable ($10k+) product, not a demo. Kept separate
 * from BAR so the design starters stay lightweight.
 */
const ENTERPRISE = `Livello ENTERPRISE (deve poter essere venduto a un cliente reale):
- Multi-pagina con routing (React Router): Home + le pagine interne pertinenti (es. Features/Solutions, Pricing, About, Blog/Resources, Contact, Legal). Nav e footer completi e coerenti.
- Conversione: CTA chiare e ripetute, form reali (validati, stati success/error), lead capture, social proof forte (loghi, numeri, case study, testimonial), trust (sicurezza, certificazioni, FAQ).
- Contenuti credibili e specifici del settore (copy professionale, non placeholder), microcopy curato, SEO di base (title/meta/OpenGraph, heading semantici, sitemap-ready).
- Design-system solido: token centralizzati, componenti riusabili (Button/Card/Input/Badge/Section), dark/light se sensato, stati completi ovunque.
- Qualità produzione: performance (lazy-load, immagini ottimizzate, code-split per route), accessibilità AA reale, i18n-ready dove utile, pronto al deploy.`;

/** Compose a full ENTERPRISE brief: stack + core + enterprise bar + quality bar. */
function enterprise(core: string): string {
  return `${STACK}\n\n${core.trim()}\n\n${ENTERPRISE}\n\n${BAR}`;
}

/**
 * Full front-end project scaffold — prepended to every brief so the agent
 * builds a real, runnable app with the best-in-class stack (not a static page).
 */
const STACK = `Crea un PROGETTO FRONT-END COMPLETO E REALE, non una singola pagina index.html statica.
- Scaffolding: Vite + React 19 + TypeScript + Tailwind CSS. Struttura in \`src/\` con un componente per ogni sezione, dati/contenuti separati, e un design-system di token (colori, type scale, spacing) centralizzato.
- Animazioni: Framer Motion per le interazioni React, GSAP + ScrollTrigger per lo scroll-driven, Lenis per lo smooth scroll, e CSS scroll-driven animations dove supportate. Sempre reduced-motion safe.
- 3D (quando ha senso): React Three Fiber (@react-three/fiber) + @react-three/drei su Three.js, oppure @splinetool/react-spline per scene Spline pronte; modelli .glb/.gltf ottimizzati (Draco), lazy-load in Suspense, dpr limitato, 60fps con fallback statico low-power.
- Installa le dipendenze, configura \`package.json\`/vite/tailwind e assicurati che il tutto giri con \`npm run dev\`.`;

/**
 * Shared quality bar + ANTI-SLOP mandate appended to every brief. This bakes the
 * `taste` skill's rules straight into the prompt text (belt-and-braces with the
 * skill injection) so the result never looks like generic AI output.
 */
const BAR = `Qualità richiesta: responsive 360px→ultrawide, WCAG AA, animazioni performanti (transform/opacity) con prefers-reduced-motion, HTML semantico, contenuti reali (niente lorem ipsum).

REGOLA ANTI-SLOP (obbligatoria — NON deve sembrare un template AI generico):
- NIENTE palette di default: mai il blu SaaS standard (#3b82f6). Scegli una palette deliberata (un accento sicuro + neutri con una temperatura, off-black/off-white, mai #000/#fff piatti).
- UN solo sistema di stile (Tailwind XOR CSS), token centralizzati, ZERO stili inline a caso e ZERO mix di framework (no Bootstrap+Tailwind).
- Gerarchia visiva vera: scala tipografica modulare (heading display grandi, body nettamente più piccolo), UNA CTA primaria dominante per vista.
- Whitespace intenzionale su base 8pt (raggruppa il correlato, separa il resto); niente elementi ammassati né vuoti casuali.
- NIENTE "card-syndrome": non incassare ogni blocco in un rettangolo bianco con ombra — usa divisori, bande, spazio, layout editoriale; le card solo dove servono.
- Layout fluido: rem/%/clamp()/grid/flex, mai larghezze fisse in px che si rompono su mobile.
- HTML semantico (header/nav/main/section/footer/button/a/h1–h3), niente "div-soup"; un elemento cliccabile è <button>/<a>, mai <div onClick>.
- Accessibilità reale: focus-visible, tastiera, alt/aria, contrasto AA.
Deve sembrare art-directed da uno studio top (livello awwwards), non un template. Se potrebbe essere qualsiasi sito, ridisegnalo.`;

/** Compose a full brief: stack scaffold → creative core → quality bar. */
function brief(core: string): string {
  return `${STACK}\n\n${core.trim()}\n\n${BAR}`;
}

export const RECIPES: WebsiteRecipe[] = [
  {
    id: "bento-saas",
    name: "Bento SaaS",
    emoji: "🍱",
    style: "Bento + Clean premium",
    layout: "Bento grid · Z-flow",
    description: "Landing SaaS con griglia bento asimmetrica tipo Apple/Vercel.",
    accent: "#f59e0b",
    skillIds: [
      "taste",
      "web3d",
      "web-architect",
      "bento-grid",
      "impeccable",
      "type-color",
      "emil-motion",
    ],
    prompt:
      brief(`Costruisci l'app web di marketing COMPLETA per un prodotto SaaS in stile BENTO GRID moderno (come le feature section di Apple e Vercel).
- Layout: hero con headline forte a sinistra e preview interattiva del prodotto a destra (percorso a Z), poi una BENTO GRID ASIMMETRICA di feature card di dimensioni diverse (la cella più grande = feature principale con un mini preview animato). Niente griglia di card tutte uguali.
- Stile: pulito e premium ma con carattere — palette deliberata con UN accento (mai il blu di default), radius/gap consistenti, hover che solleva le celle con bordo hairline luminoso.
- Sezioni (componenti separati): nav sticky, hero, bento delle feature, logos/social proof, come funziona, pricing a 3 tier, FAQ, CTA finale, footer ricco.`),
  },
  {
    id: "editorial-minimal",
    name: "Editorial Minimal",
    emoji: "⬜",
    style: "Minimalism / Swiss",
    layout: "F-shape · editoriale",
    description: "Studio/portfolio di lusso: whitespace, tipografia editoriale.",
    accent: "#78716c",
    skillIds: [
      "taste",
      "web3d",
      "minimalism",
      "web-layouts",
      "impeccable",
      "type-color",
      "smooth-scroll",
    ],
    prompt:
      brief(`Costruisci il sito di uno studio di design di lusso in stile MINIMALISMO EDITORIALE (svizzero) con layout F-SHAPE.
- Stile: il whitespace È il design — margini ampi, scala tipografica rigorosa e ampia, un display face espressivo + un body face quieto, palette quasi monocroma con UN accento sobrio, testo off-black (mai nero puro), righe hairline al posto dei box (niente card-syndrome).
- Layout: F-pattern — barra top forte, informazioni chiave lungo il bordo superiore e sinistro, dettaglio decrescente scendendo; numeri/etichette oversize come struttura, tensione asimmetrica voluta.
- Motion lento e minimale (fade lunghi, reveal delle immagini con Lenis). Sezioni: nav essenziale, hero tipografico, lavori selezionati, about, contatti, footer.`),
  },
  {
    id: "glass-aurora-ai",
    name: "Glass Aurora AI",
    emoji: "🌌",
    style: "Glassmorphism + Aurora + 3D",
    layout: "Split screen",
    description: "Sito AI futuristico con vetro, aurora e un oggetto 3D interattivo.",
    accent: "#8b5cf6",
    skillIds: [
      "taste",
      "web3d",
      "glass-aurora",
      "creative-3d",
      "hero-page",
      "motion-react",
      "type-color",
    ],
    prompt:
      brief(`Costruisci il sito di un prodotto AI dal look futuristico in stile GLASSMORPHISM con sfondo AURORA (mesh gradient animato) e un oggetto 3D interattivo.
- Layout: hero SPLIT SCREEN — a sinistra copy e CTA, a destra un pannello di vetro (backdrop-blur, bordo hairline luminoso) con una scena 3D (React Three Fiber: un oggetto/particellare che reagisce al mouse) o Spline.
- Stile: base scura profonda (non nero piatto), 2–3 aurore che scorrono lente e sfocate dietro il contenuto, glow sugli elementi focali, testo sempre leggibile (AA). Palette viola/teal deliberata, non generica.
- Sezioni: nav in vetro, hero split con 3D, feature in card di vetro (usate con misura), dimostrazione, testimonianze, CTA con shimmer, footer.`),
  },
  {
    id: "neubrutalist-agency",
    name: "Neubrutalist Agency",
    emoji: "🟨",
    style: "Neubrutalism",
    layout: "Asymmetrical",
    description: "Sito d'agenzia audace: bordi neri spessi, ombre nette.",
    accent: "#eab308",
    skillIds: [
      "taste",
      "web3d",
      "neubrutalism",
      "web-layouts",
      "impeccable",
      "micro-interactions",
      "type-color",
    ],
    prompt:
      brief(`Costruisci il sito di un'agenzia creativa in stile NEUBRUTALISM con layout ASIMMETRICO.
- Stile: bordi solidi spessi near-black, ombre offset dure (6px 6px 0 #000, senza blur), blocchi piatti e saturi (giallo elettrico, rosa, cobalto) su carta off-white, display type gigante e tight, bottoni che "si premono" (translate + collasso ombra all'active).
- Layout: griglia volutamente sbilanciata, elementi sovrapposti, sezioni off-grid con contrappeso e whitespace così da sembrare composto e non casuale (non uno stack di sezioni centrate).
- Sezioni: nav chunky, hero dichiarazione, servizi, portfolio a blocchi, team, CTA grossa, footer.`),
  },
  {
    id: "awwwards-scroll",
    name: "Awwwards Scroll Story",
    emoji: "🎬",
    style: "Cinematic scroll-driven",
    layout: "Pinned · scroll story",
    description: "Sito prodotto cinematografico, scroll-driven, livello awwwards.",
    accent: "#06b6d4",
    category: "enterprise",
    skillIds: [
      "taste",
      "web3d",
      "scroll-media",
      "gsap-motion",
      "smooth-scroll",
      "creative-3d",
      "asset-generation",
    ],
    prompt:
      enterprise(`Costruisci il sito di lancio di un PRODOTTO in stile CINEMATOGRAFICO SCROLL-DRIVEN (livello awwwards): il racconto si svela scrollando.
- Hero: sezione PINNATA con GSAP ScrollTrigger + scrub — un'immagine-sequenza su <canvas> (100–300 frame WebP, precarico del primo, lazy del resto) OPPURE un video reale scrubbato; il prodotto ruota/si assembla mentre scrolli. Fallback reduced-motion: una still.
- Smooth scroll con Lenis, reveal a stagger delle sezioni, parallax misurato (solo transform/opacity). Un dettaglio-firma (grana, griglia hairline o mesh) usato UNA volta.
- Media reali (no placeholder grigi): se manca il set di frame, genera/usa un video reale ed estrai i frame (pipeline ffmpeg), niente URL inventati.
- Sezioni: hero-sequence pinnato, feature del prodotto, specifiche, galleria, acquista/CTA, footer.`),
  },
];
