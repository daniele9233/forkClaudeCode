/**
 * Studio recipes — 10 ready-made "design briefs" that turn kikkoCode into a
 * senior front-end team. Each recipe pairs a visual STYLE with a page LAYOUT
 * and expands into a rich, self-contained prompt. Clicking a recipe drops that
 * prompt into the composer; the style/layout keywords it contains also trigger
 * the matching skill playbooks (see catalog.ts) for extra expert guidance.
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

/** Shared quality bar appended to every brief. */
const BAR = `Qualità richiesta: responsive 360px→ultrawide, WCAG AA, animazioni performanti (transform/opacity) con prefers-reduced-motion, HTML semantico, contenuti reali (niente lorem ipsum). Deve sembrare fatto da uno studio di design top con un team di front-end, non un template.`;

/** Compose a full brief: stack scaffold → creative core → quality bar. */
function brief(core: string): string {
  return `${STACK}\n\n${core.trim()}\n\n${BAR}`;
}

export const RECIPES: WebsiteRecipe[] = [
  {
    id: "bento-saas",
    name: "Bento SaaS",
    emoji: "🍱",
    style: "Bento + Clean",
    layout: "Bento grid · Z-flow",
    description: "App/landing SaaS con griglia bento tipo Apple/Vercel.",
    accent: "#f59e0b",
    skillIds: ["web-architect", "bento-grid", "impeccable", "aceternity-magic"],
    prompt:
      brief(`Costruisci l'app web di marketing COMPLETA per un prodotto SaaS in stile BENTO GRID moderno (come le feature section di Apple e Vercel).
- Layout: hero con headline forte a sinistra e preview interattiva del prodotto a destra (percorso a Z), poi una BENTO GRID asimmetrica di feature card di dimensioni diverse (la cella più grande = feature principale con un mini preview animato).
- Stile: pulito e premium, palette sobria con UN accento, radius e gap consistenti, hover che solleva le card con bordo evidenziato.
- Sezioni (componenti separati): nav sticky, hero, bento delle feature, logos/social proof, come funziona, pricing a 3 tier, FAQ, CTA finale, footer ricco.`),
  },
  {
    id: "glass-aurora-ai",
    name: "Glass Aurora AI",
    emoji: "🌌",
    style: "Glassmorphism + Aurora + 3D",
    layout: "Split screen",
    description: "Sito AI futuristico con vetro, aurora e un oggetto 3D.",
    accent: "#8b5cf6",
    skillIds: ["glass-aurora", "creative-3d", "hero-page", "motion-react"],
    prompt:
      brief(`Costruisci il sito di un prodotto AI dal look futuristico in stile GLASSMORPHISM con sfondo AURORA (mesh gradient animato) e un oggetto 3D interattivo.
- Layout: hero SPLIT SCREEN — a sinistra copy e CTA, a destra un pannello di vetro (backdrop-blur, bordo hairline luminoso) con una scena 3D (React Three Fiber: un oggetto/particellare che reagisce al mouse) o Spline.
- Stile: base scura profonda, 2–3 aurore che scorrono lente e sfocate dietro il contenuto, glow sugli elementi focali, testo sempre leggibile (AA).
- Sezioni: nav in vetro, hero split con 3D, feature in card di vetro, dimostrazione, testimonianze, CTA con shimmer, footer.`),
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
    prompt:
      brief(`Costruisci il sito di un'agenzia creativa in stile NEUBRUTALISM con layout ASIMMETRICO.
- Stile: bordi solidi spessi near-black, ombre offset dure (6px 6px 0 #000, senza blur), blocchi piatti e saturi (giallo elettrico, rosa, cobalto) su carta off-white, display type gigante e tight, bottoni che "si premono" (translate + collasso ombra all'active).
- Layout: griglia volutamente sbilanciata, elementi sovrapposti, sezioni off-grid con contrappeso e whitespace così da sembrare composto e non casuale.
- Sezioni: nav chunky, hero dichiarazione, servizi, portfolio a blocchi, team, CTA grossa, footer.`),
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
    prompt:
      brief(`Costruisci la landing di un'app fintech/mobile in stile NEUMORPHISM (soft UI) con layout centrato a card.
- Stile: un unico sfondo monocromo a bassa saturazione, elementi dello stesso hue estrusi con doppia ombra (chiara in alto-sinistra + scura in basso-destra), radius generoso, stati premuti in inset.
- IMPORTANTE accessibilità: il neumorfismo ha contrasto debole → aggiungi un colore accento reale per testo, icone e focus ring (AA) e non affidarti solo all'ombra per segnalare i controlli.
- Layout: hero centrato con mockup del telefono, card di feature morbide, come funziona, download CTA, footer.`),
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
    prompt:
      brief(`Costruisci il sito di uno studio di design di lusso in stile MINIMALISMO EDITORIALE (svizzero) con layout F-SHAPE.
- Stile: il whitespace È il design — margini ampi, scala tipografica rigorosa, un display face espressivo + un body face quieto, palette quasi monocroma con UN accento sobrio, testo off-black (mai nero puro), righe hairline al posto dei box.
- Layout: F-pattern — barra top forte, informazioni chiave lungo il bordo superiore e sinistro, dettaglio decrescente scendendo; numeri/etichette oversize come struttura.
- Motion lento e minimale (fade lunghi, reveal delle immagini con Lenis). Sezioni: nav essenziale, hero tipografico, lavori selezionati, about, contatti, footer.`),
  },
  {
    id: "skeuomorphic-product",
    name: "Skeuomorphic Product",
    emoji: "🧴",
    style: "Skeuomorphism + 3D",
    layout: "Hero showcase",
    description: "Showcase prodotto realistico con materiali e 3D.",
    accent: "#b45309",
    skillIds: ["skeuomorphism", "creative-3d", "gsap-motion", "impeccable"],
    prompt:
      brief(`Costruisci il sito showcase di un prodotto fisico in stile SKEUOMORPHISM moderno (revival tipo Apple Vision, non kitsch anni 2010) con un modello 3D del prodotto.
- Stile: materiali reali (metallo spazzolato, vetro, ceramica) resi con gradienti stratificati, grana/texture, bevel e illuminazione fisicamente plausibile.
- 3D: il prodotto in un canvas React Three Fiber (modello .glb ottimizzato) che ruota/reagisce allo scroll con GSAP ScrollTrigger; fallback immagine statica.
- Layout: hero showcase con il prodotto in grande, profondità a strati, controlli premibili. Sezioni: nav, hero 3D, dettagli materiali, specifiche, galleria, acquista CTA, footer.`),
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
    prompt:
      brief(`Costruisci una galleria/marketplace in stile CARDS LAYOUT PINTEREST (masonry) — card di altezza variabile in un flusso multi-colonna.
- Layout: masonry con CSS columns o grid, colonne che si adattano da 1 (mobile) a 4–5 (desktop); barra di filtri/tag sticky in alto; lazy-load delle immagini; scroll infinito.
- Stile: card con radius consistente, hover che rivela azioni (save/like) con micro-interazione (Framer Motion), overlay gradiente sulle immagini, spaziatura ariosa.
- Sezioni: nav con ricerca, header con filtri, griglia masonry, card di dettaglio (modale animata), footer.`),
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
    prompt:
      brief(`Costruisci un sito fashion/portfolio in stile DUOTONE con layout SPLIT SCREEN (schermo diviso) e tipografia forte.
- Layout: due metà verticali uguali che si contrappongono (immagine vs testo, o due mondi); su hover/scroll le due metà reagiscono (GSAP); collassa in stack su mobile.
- Stile: trattamento duotone delle immagini (2 colori del brand), tipografia display grande e decisa, contrasto netto, transizioni di sezione eleganti, pochissimi colori.
- Sezioni: hero split, collezioni/progetti alternati sinistra-destra, about, lookbook, contatti, footer.`),
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
    prompt:
      brief(`Costruisci una landing page di una startup ad alta conversione con layout Z-SHAPE (Z-pattern) e accenti gradient.
- Layout: l'occhio segue una Z — logo in alto a sinistra, nav/CTA in alto a destra, hero in diagonale, CTA principale in basso a destra; sezioni alternate che mantengono il flusso a zig-zag.
- Stile: moderno con bordi/testi gradient tasteful (un solo effetto firma per sezione), spotlight/beam sull'hero, entrate animate staggered (Framer Motion), bottoni con shimmer.
- Sezioni: nav, hero con doppia CTA, logos, benefici alternati, metriche, testimonianze, pricing, CTA finale, footer.`),
  },
  {
    id: "immersive-scroll",
    name: "Immersive Scroll",
    emoji: "🎬",
    style: "Cinematic / Scrollytelling",
    layout: "Asymmetrical + pin",
    description: "Brand story immersiva guidata dallo scroll, cinematografica.",
    accent: "#6366f1",
    skillIds: ["smooth-scroll", "gsap-motion", "creative-3d", "hero-page"],
    prompt:
      brief(`Costruisci un sito brand-story immersivo e cinematografico guidato dallo SCROLL (scrollytelling) con composizione ASIMMETRICA e tocchi 3D.
- Motion: scroll fluido (Lenis), sezioni che si rivelano all'ingresso staggered, momenti chiave in PIN + scrub (GSAP ScrollTrigger), parallax, indicatore di progresso; 60fps e reduced-motion safe.
- 3D/creative: un momento 3D (React Three Fiber o Spline) legato allo scroll come climax della storia; fallback statico.
- Stile: composizione asimmetrica/broken-grid, tipografia oversize come elemento grafico, immagini full-width con overlay, palette coerente.
- Sezioni: hero cinematografico, capitoli della storia (ognuno con un layout diverso), momento di prodotto pinnato, prova sociale, CTA finale, footer.`),
  },

  /* ── Enterprise verticals — full, sellable ($10k+) websites ──────── */

  {
    id: "fintech-neobank",
    name: "Fintech / Neobank",
    emoji: "🏦",
    style: "Clean corporate + data",
    layout: "Dashboard hero + grid",
    description: "Piattaforma bancaria/fintech: fiducia, sicurezza, numeri.",
    accent: "#2563eb",
    category: "enterprise",
    skillIds: ["web-architect", "type-color", "component-registry", "design-system"],
    prompt:
      enterprise(`Costruisci il sito di una PIATTAFORMA FINTECH / NEOBANK B2C+B2B, professionale e affidabile.
- Hero: headline sul valore + un mockup di dashboard/app con dati (grafici, saldo, transazioni) accanto; barra di trust (licenze, sicurezza, "regolamentato").
- Sezioni: prodotti (conti, carte, pagamenti, investimenti), come funziona, sicurezza & compliance (crittografia, 2FA), pricing trasparente, integrazioni/API, testimonial + numeri (utenti, volumi), FAQ, CTA "apri conto".
- Stile: corporate pulito, palette blu fiducia + neutri tintati, data-viz sobria (usa componenti chart), micro-interazioni discrete. Serietà bancaria, mai giocattoloso.`),
  },
  {
    id: "cybersecurity-enterprise",
    name: "Cybersecurity",
    emoji: "🛡️",
    style: "Dark techy + trust",
    layout: "Z-flow + feature grid",
    description: "Security enterprise: autorevole, tecnica, orientata al CISO.",
    accent: "#22d3ee",
    category: "enterprise",
    skillIds: ["web-architect", "glass-aurora", "type-color", "aceternity-magic"],
    prompt:
      enterprise(`Costruisci il sito di una PIATTAFORMA DI CYBERSECURITY enterprise (rivolto a CISO/IT).
- Hero scuro ad alto impatto: claim sulla protezione, animazione sottile (griglia/rete/threat map), badge di certificazioni (SOC2, ISO 27001, GDPR).
- Sezioni: piattaforma/moduli (XDR, threat intel, zero-trust), come funziona (diagramma architettura), metriche (minacce bloccate, MTTR), casi studio per settore, integrazioni, risorse (whitepaper/report), demo request form.
- Stile: dark, accenti ciano/verde tech, tipografia precisa, glow misurato, code/terminal snippet dove utile. Autorevole e rassicurante.`),
  },
  {
    id: "healthtech-medical",
    name: "HealthTech / Medical",
    emoji: "🩺",
    style: "Calm, trustworthy, accessible",
    layout: "F-shape + cards",
    description: "Sanità/medtech: calmo, accessibile, orientato alla fiducia.",
    accent: "#0d9488",
    category: "enterprise",
    skillIds: ["web-architect", "a11y-guardian", "type-color", "responsive-master"],
    prompt:
      enterprise(`Costruisci il sito di una PIATTAFORMA HEALTHTECH / clinica digitale (telemedicina, cartella clinica, prenotazioni).
- Hero rassicurante: immagine calda umana + claim sul beneficio di salute; CTA "prenota"/"inizia".
- Sezioni: servizi/specialità, come funziona (3 step), medici/team con foto, sicurezza dati (HIPAA/GDPR), prezzi/coperture, storie pazienti, FAQ, prenotazione con form.
- Stile: palette calma (verde/teal + neutri caldi), spazi ariosi, tipografia leggibilissima, ACCESSIBILITÀ impeccabile (AA+, focus, contrasto, target ≥44px). Tono empatico e professionale.`),
  },
  {
    id: "realestate-luxury",
    name: "Luxury Real Estate",
    emoji: "🏛️",
    style: "Cinematic editorial",
    layout: "Full-bleed + split",
    description: "Immobiliare di lusso: immagini full-bleed, eleganza, tour.",
    accent: "#a16207",
    category: "enterprise",
    skillIds: ["web-architect", "minimalism", "smooth-scroll", "gsap-motion"],
    prompt:
      enterprise(`Costruisci il sito di un'agenzia IMMOBILIARE DI LUSSO / sviluppo residenziale premium.
- Hero: immagine full-bleed cinematografica della proprietà + titolo elegante; smooth scroll (Lenis) e reveal raffinati.
- Sezioni: proprietà in evidenza (galleria filtrabile con prezzo/zona/camere), scheda proprietà (gallery, planimetrie, mappa, tour 360/video), il team/agenti, servizi (compravendita, gestione), storie/press, contatto con form richiesta visita.
- Stile: editoriale di lusso, whitespace, serif elegante + sans pulito, palette oro/greige sobria, fotografia protagonista. Percezione premium alta.`),
  },
  {
    id: "lawfirm-corporate",
    name: "Law Firm / Advisory",
    emoji: "⚖️",
    style: "Authoritative editorial",
    layout: "F-shape serif",
    description: "Studio legale/consulenza: autorevole, sobrio, credibile.",
    accent: "#1e3a5f",
    category: "enterprise",
    skillIds: ["web-architect", "minimalism", "type-color", "impeccable"],
    prompt:
      enterprise(`Costruisci il sito di uno STUDIO LEGALE / società di consulenza professionale di alto livello.
- Hero sobrio e autorevole: claim di competenza + prova (anni, casi, settori); niente fronzoli.
- Sezioni: aree di pratica/servizi, professionisti (bio, foto, credenziali), casi/risultati (con numeri dove possibile), settori serviti, insight/blog legale, riconoscimenti/press, contatti + form consulenza.
- Stile: editoriale autorevole, serif elegante per i titoli + sans leggibile, palette blu notte/bordeaux + neutri, griglia rigorosa, tono istituzionale e affidabile.`),
  },
  {
    id: "ecommerce-d2c",
    name: "D2C E-commerce Brand",
    emoji: "🛍️",
    style: "Premium product brand",
    layout: "Editorial + grid",
    description: "Brand D2C premium: storytelling prodotto + conversione.",
    accent: "#db2777",
    category: "enterprise",
    skillIds: ["web-architect", "micro-interactions", "type-color", "gsap-motion"],
    prompt:
      enterprise(`Costruisci lo storefront di un BRAND D2C PREMIUM (prodotto fisico: beauty, food, design, apparel).
- Hero brand-first: prodotto eroe con fotografia/still-life curata + claim; scroll reveal eleganti.
- Sezioni: storytelling del prodotto (benefici, ingredienti/materiali, come si usa), griglia catalogo, pagina prodotto (galleria, varianti, add-to-cart, recensioni, bundle), sostenibilità/valori, UGC/social proof, newsletter, footer ricco.
- Stile: editoriale premium con forte identità di brand, tipografia distintiva, micro-interazioni deliziose su add-to-cart e hover, palette del brand. Orientato alla conversione (AOV, trust badge, spedizione).`),
  },
  {
    id: "web3-protocol",
    name: "Web3 / Crypto Protocol",
    emoji: "🪙",
    style: "Futuristic glass + 3D",
    layout: "Split + immersive",
    description: "Protocollo web3/crypto: futuristico, animato, tecnico.",
    accent: "#7c3aed",
    category: "enterprise",
    skillIds: ["web-architect", "glass-aurora", "creative-3d", "aceternity-magic"],
    prompt:
      enterprise(`Costruisci il sito di un PROTOCOLLO WEB3 / prodotto crypto (DeFi, L2, wallet, infra).
- Hero futuristico: claim + oggetto/particellare 3D (React Three Fiber) o scena Spline, sfondo aurora/glow; stats on-chain (TVL, tx, holder).
- Sezioni: come funziona (architettura/diagramma), prodotti/moduli, tokenomics (grafici), sicurezza/audit, ecosistema/partner, roadmap, docs/dev CTA, community.
- Stile: glassmorphism scuro, gradient/glow misurati, tipografia tech, animazioni performanti. Innovativo ma credibile (audit, trasparenza), niente look "scam".`),
  },
  {
    id: "ai-saas-enterprise",
    name: "Enterprise AI Platform",
    emoji: "🤖",
    style: "Modern gradient + technical",
    layout: "Bento + Z-flow",
    description: "Piattaforma AI enterprise: moderna, tecnica, scalabile.",
    accent: "#8b5cf6",
    category: "enterprise",
    skillIds: ["web-architect", "bento-grid", "aceternity-magic", "type-color"],
    prompt:
      enterprise(`Costruisci il sito di una PIATTAFORMA AI ENTERPRISE (LLM/agenti/automazione per aziende).
- Hero: claim sul valore business + demo interattiva/prompt playground o mockup; loghi clienti enterprise.
- Sezioni: capabilities in BENTO GRID, use case per funzione/settore, come funziona (pipeline/architettura), sicurezza & governance (dati, privacy, SOC2), integrazioni, pricing enterprise (+ "contatta il sales"), risorse/docs, CTA demo.
- Stile: moderno con accenti gradient tasteful, un solo effetto firma per sezione, tipografia pulita, data/diagrammi chiari. Percezione "leader di categoria".`),
  },
  {
    id: "devtool-api",
    name: "Developer Tool / API",
    emoji: "⌨️",
    style: "Code-forward dark",
    layout: "Split code + docs",
    description: "Dev tool/API: code-first, scuro, per sviluppatori.",
    accent: "#10b981",
    category: "enterprise",
    skillIds: ["web-architect", "component-registry", "type-color", "micro-interactions"],
    prompt:
      enterprise(`Costruisci il sito di un DEVELOPER TOOL / PIATTAFORMA API (infra, database, CI, SDK).
- Hero code-forward: claim + blocco di codice reale con tab multi-linguaggio (curl/JS/Python) e copy button; "npm install" in evidenza.
- Sezioni: feature per sviluppatori, quickstart (3 step con codice), esempi/ricette, performance/benchmark, pricing usage-based, docs/reference CTA, community (GitHub stars, Discord), changelog.
- Stile: scuro, mono per il codice + sans pulito per il testo, accenti verde/emerald, micro-interazioni sui code block, syntax highlight. Tono tecnico e credibile.`),
  },
  {
    id: "agency-award",
    name: "Award-winning Agency",
    emoji: "🏆",
    style: "Immersive bold",
    layout: "Asymmetrical + scroll",
    description: "Agenzia creativa da premio: immersiva, audace, portfolio.",
    accent: "#ef4444",
    category: "enterprise",
    skillIds: ["web-architect", "smooth-scroll", "gsap-motion", "creative-3d"],
    prompt:
      enterprise(`Costruisci il sito di un'AGENZIA CREATIVA/DIGITALE da premio (livello Awwwards).
- Hero audace: tipografia oversize come grafica, smooth scroll (Lenis), reveal e transizioni cinematografiche (GSAP), eventuale tocco 3D.
- Sezioni: lavori/case study (griglia asimmetrica con hover ricchi → pagina case study immersiva con risultati), servizi, approccio/processo, team, riconoscimenti/press, contatto con form progetto.
- Stile: composizione asimmetrica/broken-grid, forte personalità, palette decisa, motion protagonista ma 60fps e reduced-motion safe. Deve gridare "studio top".`),
  },
  {
    id: "hospitality-luxury",
    name: "Luxury Hospitality",
    emoji: "🏝️",
    style: "Sensorial editorial",
    layout: "Full-bleed + booking",
    description: "Hotel/resort di lusso: sensoriale, elegante, prenotazione.",
    accent: "#b45309",
    category: "enterprise",
    skillIds: ["web-architect", "minimalism", "smooth-scroll", "type-color"],
    prompt:
      enterprise(`Costruisci il sito di un HOTEL / RESORT / brand di HOSPITALITY di lusso.
- Hero: immagine/video full-bleed evocativo + claim sensoriale; widget di prenotazione (date, ospiti) prominente.
- Sezioni: camere & suite (galleria, servizi, prezzi), esperienze (spa, ristorante, attività), gallery, la location/storia, offerte, recensioni, prenota (form/booking), contatti & mappa.
- Stile: editoriale sensoriale, whitespace, serif elegante, fotografia protagonista, palette calda naturale, motion lento e raffinato. Percezione 5 stelle.`),
  },
  {
    id: "corporate-b2b",
    name: "Corporate B2B / Consulting",
    emoji: "🏢",
    style: "Trust corporate",
    layout: "Structured grid",
    description: "Azienda B2B/consulenza: fiducia, case study, solidità.",
    accent: "#0f766e",
    category: "enterprise",
    skillIds: ["web-architect", "design-system", "type-color", "impeccable"],
    prompt:
      enterprise(`Costruisci il sito di un'AZIENDA B2B / società di consulenza o servizi enterprise.
- Hero professionale: claim su risultato di business + prova (clienti, numeri, settori); CTA "parla con noi".
- Sezioni: soluzioni/servizi per esigenza, settori serviti, case study con risultati misurabili (KPI), metodo/processo, team leadership, partner/certificazioni, insight/blog, careers, contatti + form qualificato.
- Stile: corporate solido ma moderno (non anonimo), design-system coerente, palette professionale con un accento, griglia rigorosa, tono competente e affidabile.`),
  },
  {
    id: "saas-analytics",
    name: "Analytics / Data Platform",
    emoji: "📊",
    style: "Dashboard-driven bento",
    layout: "Bento + charts",
    description: "Piattaforma analytics/dati: dashboard, grafici, insight.",
    accent: "#3b82f6",
    category: "enterprise",
    skillIds: ["web-architect", "bento-grid", "component-registry", "design-system"],
    prompt:
      enterprise(`Costruisci il sito di una PIATTAFORMA ANALYTICS / BUSINESS INTELLIGENCE (dashboard, dati, insight).
- Hero: claim + mockup di dashboard reale con grafici (usa componenti chart: line/bar/area), toggle live.
- Sezioni: capability in BENTO GRID con mini-visualizzazioni, use case per team (marketing/finance/product), integrazioni sorgenti dati, sicurezza/governance, pricing per seat/volume, testimonial con KPI, CTA prova gratuita.
- Stile: pulito e data-first, palette blu + neutri tintati, data-viz coerente e leggibile (accessibile), micro-interazioni sui numeri. Percezione "strumento serio".`),
  },
  {
    id: "education-lms",
    name: "Education / LMS",
    emoji: "🎓",
    style: "Friendly structured",
    layout: "Cards + Z-flow",
    description: "Piattaforma corsi/e-learning: chiara, motivante, conversione.",
    accent: "#f59e0b",
    category: "enterprise",
    skillIds: ["web-architect", "micro-interactions", "type-color", "responsive-master"],
    prompt:
      enterprise(`Costruisci il sito di una PIATTAFORMA EDUCATION / e-learning / LMS (corsi online, bootcamp, academy).
- Hero: claim sul risultato di apprendimento/carriera + CTA "inizia"; prova sociale (studenti, rating, aziende dove lavorano i diplomati).
- Sezioni: catalogo corsi (card con livello, durata, prezzo, rating, filtri), pagina corso (programma/curriculum, docente, recensioni, iscrizione), percorsi/certificazioni, come funziona, per aziende (B2B), FAQ, iscrizione con form.
- Stile: amichevole ma professionale, tipografia chiara, palette calda accogliente con un accento, micro-interazioni motivanti (progress, badge), gerarchia didattica ordinata.`),
  },

  /* ── DESIGN.md-driven — visual consistency locked by a spec doc ───── */

  {
    id: "designmd-flagship",
    name: "Design System First",
    emoji: "📋",
    style: "Spec-driven premium",
    layout: "Multi-section",
    description: "Sito premium costruito a partire da un DESIGN.md coerente.",
    accent: "#0ea5e9",
    category: "enterprise",
    skillIds: ["design-md", "web-architect", "type-color", "impeccable"],
    prompt:
      enterprise(`Costruisci un sito prodotto premium METTENDO PRIMA PER ISCRITTO il design system.
- STEP 1: genera alla radice un file \`DESIGN.md\` con le 9 sezioni (tema & atmosfera, palette con hex + ruoli semantici, tipografia con tabella gerarchia, componenti con tutti gli stati, layout & spacing 8pt, profondità & ombre, do's & don'ts, responsive & touch target, agent prompt guide).
- STEP 2: implementa i token UNA volta (CSS variables / Tailwind @theme) esattamente come da DESIGN.md, poi costruisci ogni sezione attenendoti rigorosamente al documento (nessun magic number).
- Sezioni sito: nav, hero, feature, come funziona, prezzi, testimonianze, FAQ, CTA, footer — tutte coerenti con lo stesso linguaggio visivo.`),
  },
  {
    id: "designmd-styleguide",
    name: "Living Style Guide",
    emoji: "🎛️",
    style: "Brand system docs",
    layout: "Docs + gallery",
    description: "Style guide vivo: token, componenti, do/don't dal DESIGN.md.",
    accent: "#7c3aed",
    category: "enterprise",
    skillIds: ["design-md", "design-system", "component-registry", "type-color"],
    prompt:
      enterprise(`Costruisci un LIVING STYLE GUIDE / sito di brand & design system (tipo un mini Storybook + brand book).
- STEP 1: genera un \`DESIGN.md\` completo (9 sezioni) come fonte di verità.
- Il sito DOCUMENTA e mostra quel design system: pagina token (colori con hex+ruolo, tipografia, spacing, ombre), gallery componenti con tutti gli stati (button, card, input, nav, badge) e snippet di codice copiabili, sezione do's & don'ts con esempi giusto/sbagliato, principi di layout e responsive, linee guida voce/brand.
- Stile: pulito e autorevole, navigazione laterale, dark/light basati sui token, ricerca. Deve sembrare la documentazione di design di un'azienda seria.`),
  },
  {
    id: "designmd-productivity",
    name: "Productivity SaaS",
    emoji: "🗂️",
    style: "Calm, focused, spec-driven",
    layout: "Bento + Z-flow",
    description: "Software di produttività coerente, partendo da un DESIGN.md.",
    accent: "#059669",
    category: "enterprise",
    skillIds: ["design-md", "web-architect", "bento-grid", "micro-interactions"],
    prompt:
      enterprise(`Costruisci il sito di un SOFTWARE DI PRODUTTIVITÀ (note, task, docs, collaborazione), coerente e focalizzato.
- STEP 1: genera un \`DESIGN.md\` (9 sezioni) e attieniti ad esso in tutto il sito.
- Hero: claim sul "fai di più con meno" + mockup pulito dell'app; palette calma e focalizzata.
- Sezioni: capability in BENTO GRID, use case per team, integrazioni, sicurezza, prezzi per seat, testimonianze, CTA prova gratuita.
- Stile: calmo e ordinato, whitespace, micro-interazioni discrete, gerarchia impeccabile — la coerenza è il punto di forza (ogni pagina identica nel linguaggio visivo).`),
  },
  {
    id: "designmd-media",
    name: "Media / Consumer Tech",
    emoji: "📺",
    style: "Bold consumer, spec-driven",
    layout: "Editorial + cards",
    description: "Prodotto media/consumer vivace ma coerente, da un DESIGN.md.",
    accent: "#f43f5e",
    category: "enterprise",
    skillIds: ["design-md", "web-architect", "type-color", "gsap-motion"],
    prompt:
      enterprise(`Costruisci il sito di un PRODOTTO MEDIA / CONSUMER TECH (streaming, podcast, social, entertainment), vivace ma coerente.
- STEP 1: genera un \`DESIGN.md\` (9 sezioni) e usalo come fonte di verità per mantenere coerenza pur con un look audace.
- Hero: forte impatto visivo (immagine/contenuto in evidenza) + CTA "provalo"; energia consumer.
- Sezioni: contenuti/feature in editoriale + card, come funziona, prezzi/piani, storie/creator, app download, footer.
- Stile: bold e colorato ma disciplinato dai token, tipografia espressiva, motion vivace (GSAP) ma performante e reduced-motion safe.`),
  },

  /* ── Scroll-media & video — sequenze frame, video scrubbing, video reale ── */

  {
    id: "scroll-product-reveal",
    name: "Product Reveal (AirPods)",
    emoji: "🎞️",
    style: "Cinematic product",
    layout: "Pinned image-sequence",
    description: "Hero prodotto che si assembla/ruota con sequenza frame allo scroll.",
    accent: "#0ea5e9",
    category: "enterprise",
    skillIds: ["scroll-media", "video-pipeline", "web-architect", "hero-page"],
    prompt:
      enterprise(`Costruisci il sito di lancio di un PRODOTTO con un hero a SCROLL IMAGE-SEQUENCE stile Apple AirPods: il prodotto ruota/si assembla mentre scrolli.
- Sequenza: 100–300 frame disegnati su un \`<canvas>\` pilotato dallo scroll (GSAP ScrollTrigger, sezione pinnata + scrub). Precarica il primo frame, lazy-load del resto, frame in WebP ridimensionati. Fallback reduced-motion: un'unica still del prodotto.
- Media: se manca il set di frame, genera/usa un video reale e ricava i frame (pipeline ffmpeg); niente URL frame inventati.
- Sezioni: hero-sequence pinnato, feature del prodotto, specifiche, galleria, acquista, footer.`),
  },
  {
    id: "scroll-cinematic-video",
    name: "Cinematic Scroll Video",
    emoji: "🎬",
    style: "Cinematic brand film",
    layout: "Video scrubbing",
    description: "Brand film il cui avanzamento è pilotato dallo scroll (scrubbing).",
    accent: "#6366f1",
    skillIds: ["scroll-media", "gsap-motion", "smooth-scroll", "hero-page"],
    prompt:
      brief(`Costruisci una landing brand cinematografica con VIDEO SCROLL-CONTROLLED (scrubbing): il \`currentTime\` di un video muto pilotato dal progresso di scroll, con testi che compaiono a momenti chiave.
- Usa un video reale corto (stock gratuito Pexels/Coverr) muted + playsinline + poster; per la massima fluidità valuta l'image-sequence su canvas al posto dello scrub diretto.
- Smooth scroll (Lenis), sezioni testo sincronizzate ai timestamp, pausa quando offscreen, reduced-motion safe (mostra un poster + testo).
- Sezioni: hero video scrubbato, capitoli del racconto, CTA finale, footer.`),
  },
  {
    id: "scroll-frame-story",
    name: "Frame-by-frame Story",
    emoji: "📽️",
    style: "Scrollytelling frames",
    layout: "Multi-chapter canvas",
    description: "Storia lunga con una sequenza di frame per ogni capitolo.",
    accent: "#0d9488",
    skillIds: ["scroll-media", "video-pipeline", "smooth-scroll", "web-layouts"],
    prompt:
      brief(`Costruisci un sito di STORYTELLING immersivo dove ogni capitolo è una SEQUENZA DI FRAME frame-by-frame su canvas guidata dallo scroll.
- Ogni capitolo: sezione pinnata con la propria image-sequence (100–200 frame WebP), testo che entra staggered; transizioni pulite tra capitoli.
- Media: estrai i frame da video reali con ffmpeg (o generali se c'è un gen tool); cache decodificata, precarico progressivo, fallback reduced-motion (key frame statici).
- Composizione asimmetrica, tipografia oversize, indicatore di progresso.`),
  },
  {
    id: "scroll-real-video-landing",
    name: "Real Video Landing",
    emoji: "📹",
    style: "Product + real video",
    layout: "Video hero + sections",
    description: "Landing SaaS/prodotto con hero a video reale di sfondo.",
    accent: "#2563eb",
    category: "enterprise",
    skillIds: ["scroll-media", "web-architect", "aceternity-magic", "type-color"],
    prompt:
      enterprise(`Costruisci una landing di prodotto/SaaS con HERO A VIDEO REALE di sfondo (stock gratuito Pexels/Coverr/Mixkit): loop muted playsinline + poster + overlay per il contrasto del testo, WebM+MP4, lazy e compresso.
- Il video resta di supporto, non disturba la leggibilità; pausa quando offscreen; su mobile mostra il poster statico.
- Sezioni: hero video + headline e CTA, feature, come funziona, social proof, pricing, FAQ, CTA finale, footer — tutto veloce e performante.`),
  },
  {
    id: "scroll-fashion-reel",
    name: "Fashion Lookbook Reel",
    emoji: "👗",
    style: "Editorial fashion",
    layout: "Reels + sequences",
    description: "Sito moda con reel scroll-controlled e sequenze immagini.",
    accent: "#db2777",
    skillIds: ["scroll-media", "minimalism", "gsap-motion", "asset-generation"],
    prompt:
      brief(`Costruisci un sito fashion/lookbook editoriale che alterna REEL VIDEO scroll-controlled e SEQUENZE DI IMMAGINI dei capi.
- Hero: reel muto scrubbato dallo scroll o image-sequence del capo; look editoriale, whitespace, tipografia display.
- Sezioni: collezioni alternate (reel + still), lookbook a griglia, dettagli capo, contatti; immagini REALI (mai placeholder grigi: Picsum/gen tool + trattamento duotone/grana).
- Motion raffinato (GSAP), reduced-motion safe, tutto lazy e 60fps.`),
  },
];
