/**
 * Studio recipes — 10 ready-made "design briefs" that turn kikkoCode into a
 * senior front-end team. Each recipe pairs a visual STYLE with a page LAYOUT
 * and expands into a rich, self-contained prompt. Clicking a recipe drops that
 * prompt into the composer; the style/layout keywords it contains also trigger
 * the matching skill playbooks (see catalog.ts) for extra expert guidance.
 *
 * The prompts are written in Italian (the user's language) but keep the English
 * design terms so the skill matcher and the model both recognize the intent.
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
  /** The full brief dropped into the composer on click. */
  prompt: string;
}

/** Shared quality bar appended to every brief. */
const BAR =
  "Qualità richiesta: responsive 360px→ultrawide, WCAG AA, animazioni solo su transform/opacity con prefers-reduced-motion, HTML semantico, contenuti reali (niente lorem ipsum). Deve sembrare fatto da uno studio di design top, non un template.";

export const RECIPES: WebsiteRecipe[] = [
  {
    id: "bento-saas",
    name: "Bento SaaS",
    emoji: "🍱",
    style: "Bento + Clean",
    layout: "Bento grid · Z-flow",
    description: "Landing SaaS moderna con griglia bento tipo Apple/Vercel.",
    accent: "#f59e0b",
    skillIds: ["web-architect", "bento-grid", "impeccable", "aceternity-magic"],
    prompt: `Crea una landing page COMPLETA per un prodotto SaaS in stile BENTO GRID moderno (come le feature section di Apple e Vercel).
- Layout: hero con headline forte a sinistra e preview del prodotto a destra (percorso a Z), poi una BENTO GRID asimmetrica di feature card di dimensioni diverse (la cella più grande = feature principale con un mini preview animato).
- Stile: pulito e premium, palette sobria con UN accento, radius e gap consistenti, hover che solleva leggermente le card con bordo evidenziato.
- Sezioni: nav sticky, hero, bento delle feature, logos/social proof, come funziona, pricing a 3 tier, FAQ, CTA finale, footer ricco.
${BAR}`,
  },
  {
    id: "glass-aurora-ai",
    name: "Glass Aurora AI",
    emoji: "🌌",
    style: "Glassmorphism + Aurora",
    layout: "Split screen",
    description: "Sito AI/futuristico con pannelli in vetro e mesh gradient.",
    accent: "#8b5cf6",
    skillIds: ["glass-aurora", "hero-page", "web-layouts", "motion-react"],
    prompt: `Crea un sito per un prodotto AI dal look futuristico in stile GLASSMORPHISM con sfondo AURORA (mesh gradient animato).
- Layout: hero SPLIT SCREEN — a sinistra copy e CTA, a destra un pannello di vetro (backdrop-blur, bordo hairline luminoso in alto) con un mockup/animazione del prodotto.
- Stile: base scura profonda, 2–3 aurore che scorrono lente e sfocate dietro il contenuto, glow colorato sugli elementi focali, testo sempre leggibile (AA, overlay se serve).
- Sezioni: nav in vetro, hero split, feature in card di vetro, dimostrazione, testimonianze, CTA con shimmer, footer.
${BAR}`,
  },
  {
    id: "neubrutalist-agency",
    name: "Neubrutalist Agency",
    emoji: "🟨",
    style: "Neubrutalism",
    layout: "Asymmetrical",
    description: "Sito d'agenzia audace: bordi neri spessi, ombre nette.",
    accent: "#eab308",
    skillIds: ["neubrutalism", "web-layouts", "impeccable", "micro-interactions"],
    prompt: `Crea il sito di un'agenzia creativa in stile NEUBRUTALISM con layout ASIMMETRICO.
- Stile: bordi solidi spessi near-black, ombre offset dure (6px 6px 0 #000, senza blur), blocchi piatti e saturi (giallo elettrico, rosa, cobalto) su carta off-white, display type gigante e tight, bottoni che "si premono" (translate + collasso ombra all'active).
- Layout: griglia volutamente sbilanciata, elementi sovrapposti, sezioni off-grid con contrappeso e whitespace così da sembrare composto e non casuale.
- Sezioni: nav chunky, hero dichiarazione, servizi, portfolio a blocchi, team, CTA grossa, footer.
${BAR}`,
  },
  {
    id: "neumorphic-app",
    name: "Soft Neumorphic",
    emoji: "🔘",
    style: "Neumorphism / Soft UI",
    layout: "Centered cards",
    description: "Landing app/fintech soft, superfici estruse morbide.",
    accent: "#64748b",
    skillIds: ["neumorphism", "web-architect", "a11y-guardian", "responsive-master"],
    prompt: `Crea la landing di un'app fintech/mobile in stile NEUMORPHISM (soft UI) con layout centrato a card.
- Stile: un unico sfondo monocromo a bassa saturazione, elementi dello stesso hue estrusi con doppia ombra (chiara in alto-sinistra + scura in basso-destra), radius generoso, stati premuti in inset.
- IMPORTANTE accessibilità: il neumorfismo ha contrasto debole → aggiungi un colore accento reale per testo, icone e focus ring (AA) e non affidarti solo all'ombra per segnalare i controlli.
- Layout: hero centrato con mockup del telefono, card di feature morbide, come funziona, download CTA, footer.
${BAR}`,
  },
  {
    id: "editorial-minimal",
    name: "Editorial Minimal",
    emoji: "⬜",
    style: "Minimalism / Swiss",
    layout: "F-shape",
    description: "Studio/portfolio di lusso: whitespace, tipografia editoriale.",
    accent: "#78716c",
    skillIds: ["minimalism", "web-layouts", "impeccable", "smooth-scroll"],
    prompt: `Crea il sito di uno studio di design di lusso in stile MINIMALISMO EDITORIALE (svizzero) con layout F-SHAPE.
- Stile: il whitespace È il design — margini ampi, scala tipografica rigorosa, un display face espressivo + un body face quieto, palette quasi monocroma con UN accento sobrio, testo off-black (mai nero puro), righe hairline al posto dei box.
- Layout: F-pattern — barra top forte, informazioni chiave lungo il bordo superiore e sinistro, dettaglio decrescente scendendo; numeri/etichette oversize come struttura.
- Motion lento e minimale (fade lunghi, reveal delle immagini). Sezioni: nav essenziale, hero tipografico, lavori selezionati, about, contatti, footer.
${BAR}`,
  },
  {
    id: "skeuomorphic-product",
    name: "Skeuomorphic Product",
    emoji: "🧴",
    style: "Skeuomorphism",
    layout: "Hero showcase",
    description: "Showcase prodotto realistico: materiali, texture, profondità.",
    accent: "#b45309",
    skillIds: ["skeuomorphism", "hero-page", "gsap-motion", "impeccable"],
    prompt: `Crea il sito showcase di un prodotto fisico in stile SKEUOMORPHISM moderno (revival tipo Apple Vision, non kitsch anni 2010).
- Stile: materiali reali (metallo spazzolato, vetro, ceramica) resi con gradienti stratificati, grana/texture, bevel interni/esterni e illuminazione fisicamente plausibile (highlight speculari sui bordi alti, occlusione morbida sotto).
- Layout: hero showcase con il prodotto in grande al centro, profondità a strati, controlli che sembrano premibili e rispondono con profondità; type crisp e moderno sopra le superfici ricche.
- Sezioni: nav, hero prodotto, dettagli materiali, specifiche, galleria, acquista CTA, footer.
${BAR}`,
  },
  {
    id: "pinterest-gallery",
    name: "Pinterest Gallery",
    emoji: "📌",
    style: "Cards / Masonry",
    layout: "Pinterest masonry",
    description: "Galleria/marketplace a card fluide di altezze variabili.",
    accent: "#e11d48",
    skillIds: ["web-layouts", "bento-grid", "micro-interactions", "responsive-master"],
    prompt: `Crea una galleria/marketplace in stile CARDS LAYOUT PINTEREST (masonry) — card di altezza variabile in un flusso multi-colonna.
- Layout: masonry con CSS columns o grid, colonne che si adattano da 1 (mobile) a 4–5 (desktop); barra di filtri/tag sticky in alto; lazy-load delle immagini.
- Stile: card con radius consistente, hover che rivela azioni (save/like) con micro-interazione, overlay gradiente sulle immagini per leggibilità del testo, spaziatura ariosa.
- Sezioni: nav con ricerca, header con filtri, griglia masonry infinita, card di dettaglio (modale), footer.
${BAR}`,
  },
  {
    id: "split-duotone",
    name: "Split Duotone",
    emoji: "⬛",
    style: "Duotone + Bold Type",
    layout: "Split screen",
    description: "Sito fashion/portfolio a schermo diviso, forte contrasto.",
    accent: "#0d9488",
    skillIds: ["web-layouts", "hero-page", "gsap-motion", "minimalism"],
    prompt: `Crea un sito fashion/portfolio in stile DUOTONE con layout SPLIT SCREEN (schermo diviso) e tipografia forte.
- Layout: due metà verticali uguali che si contrappongono (immagine vs testo, o due mondi); su hover/scroll le due metà reagiscono; collassa in stack su mobile.
- Stile: trattamento duotone delle immagini (2 colori del brand), tipografia display grande e decisa, contrasto netto, transizioni di sezione eleganti (GSAP), pochissimi colori.
- Sezioni: hero split, collezioni/progetti alternati sinistra-destra, about, lookbook, contatti, footer.
${BAR}`,
  },
  {
    id: "z-startup",
    name: "Z-Pattern Startup",
    emoji: "⚡",
    style: "Gradient + Motion",
    layout: "Z-shape",
    description: "Landing startup ad alta conversione, percorso a Z.",
    accent: "#3b82f6",
    skillIds: ["web-architect", "web-layouts", "aceternity-magic", "motion-react"],
    prompt: `Crea una landing page di una startup ad alta conversione con layout Z-SHAPE (Z-pattern) e accenti gradient.
- Layout: l'occhio segue una Z — logo in alto a sinistra, nav/CTA in alto a destra, hero in diagonale, CTA principale in basso a destra; sezioni alternate che mantengono il flusso a zig-zag.
- Stile: moderno con bordi/testi gradient tasteful (un solo effetto firma per sezione), spotlight/beam sull'hero, entrate animate staggered, bottoni con shimmer.
- Sezioni: nav, hero con doppia CTA, logos, benefici alternati, metriche, testimonianze, pricing, CTA finale, footer.
${BAR}`,
  },
  {
    id: "immersive-scroll",
    name: "Immersive Scroll",
    emoji: "🎬",
    style: "Cinematic / Scrollytelling",
    layout: "Asymmetrical + pin",
    description: "Brand story immersiva guidata dallo scroll, cinematografica.",
    accent: "#6366f1",
    skillIds: ["smooth-scroll", "gsap-motion", "web-layouts", "hero-page"],
    prompt: `Crea un sito brand-story immersivo e cinematografico guidato dallo SCROLL (scrollytelling) con composizione ASIMMETRICA.
- Motion: scroll fluido (Lenis), sezioni che si rivelano all'ingresso staggered, momenti chiave in PIN + scrub (GSAP ScrollTrigger), parallax sottile, indicatore di progresso; tutto 60fps e reduced-motion safe.
- Stile: composizione asimmetrica/broken-grid, tipografia oversize come elemento grafico, immagini a tutta larghezza con overlay, palette decisa e coerente.
- Sezioni: hero cinematografico, capitoli della storia (ognuno con un layout diverso), momento di prodotto pinnato, prova sociale, CTA finale forte, footer.
${BAR}`,
  },
];
