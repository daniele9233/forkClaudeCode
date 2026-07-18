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
   * "enterprise" = full, sellable, industry-specific websites; "blender" =
   * Blender-MCP-first briefs (bespoke .glb modeled live in the user's open
   * Blender). Defaults to "style" when omitted.
   */
  category?: "style" | "enterprise" | "blender";
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
- Installa le dipendenze, configura \`package.json\`/vite/tailwind e assicurati che il tutto giri con \`npm run dev\`.

ARSENALE (usa gli strumenti MCP DISPONIBILI — controlla quali sono collegati e sfruttali):
- FIGMA MCP collegato? Se l'utente indica un file/frame Figma, leggilo e implementa quel design FEDELMENTE (misure, testi, stili esatti) invece di inventare.
- BLENDER MCP collegato? Per l'hero 3D crea in Blender un asset su misura per il concept (modello + materiali), esportalo .glb ottimizzato e caricalo in R3F con drei — un asset UNICO batte qualsiasi primitiva. Lavora SOLO con i tool MCP nella scena APERTA dell'utente (lui la guarda): MAI lanciare blender --background o script .py esterni.
- 21st MCP collegato? Genera lì i componenti UI complessi (pricing, testimonial, nav) a qualità 21st.dev e integrali nel design-system del progetto.
- Playwright MCP collegato? Dopo il build, apri la pagina e verificane il rendering reale.
Se uno strumento NON è collegato, procedi senza (nessun blocco) — ma se c'è, usarlo è OBBLIGATORIO quando pertinente.`;

/**
 * Hard Blender pipeline appended to the Blender-first recipes. These briefs
 * only make sense with the Blender MCP connected to the user's OPEN instance:
 * the asset is modeled live in their viewport, exported .glb, and loaded in
 * R3F — the "wow" is a bespoke model no template can have.
 */
const BLENDER_PIPELINE = `PIPELINE BLENDER (OBBLIGATORIA — il Blender MCP è collegato alla scena APERTA dell'utente):
- Usa SOLO gli strumenti MCP di Blender (ispezione scena + esecuzione codice nella scena live): l'utente DEVE vedere il modello nascere nella sua viewport. VIETATO lanciare blender --background o script .py esterni — creano un'istanza separata che l'utente non vede = fallimento.
- Modella un asset SU MISURA per il concept: forme lavorate (bevel, subdivision, modificatori, curve), MAI una primitiva nuda. Materiali PBR curati (Principled BSDF con metallic/roughness deliberati, emissive dove serve), smooth shading, origini centrate, scala coerente, nomi oggetto puliti.
- Budget performance web: ~50k triangoli totali max, texture ≤2048px.
- Esporta .glb (GLB binario, Draco se disponibile) in \`public/models/\` del progetto web; verifica che il file esista e pesi <5MB.
- Caricalo con useGLTF di drei in React Three Fiber (Suspense + fallback poster); luci/environment nel canvas coerenti col look del sito; controlla che il modello sia visibile e inquadrato (niente canvas nero).
- Se i tool Blender MCP non rispondono, FERMATI e dillo all'utente (Blender aperto? "Start MCP Server" premuto?) invece di ripiegare su script.`;

/** Compose a Blender-first brief: stack → blender pipeline → core → bar. */
function blenderBrief(core: string): string {
  return `${STACK}\n\n${BLENDER_PIPELINE}\n\n${core.trim()}\n\n${BAR}`;
}

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
Deve sembrare art-directed da uno studio top (livello awwwards SOTD), non un template. Se potrebbe essere qualsiasi sito, ridisegnalo.

IL MOMENTO FIRMA (obbligatorio): ogni sito deve avere UN momento memorabile — un hero WebGL, una sequenza scroll pinnata coreografata, o una composizione tipografica audace. Un hero statico "titolo+bottone su sfondo piatto" è BOCCIATO in partenza. Dichiara il concept in una frase e falla guidare ogni scelta.`;

/** Compose a full brief: stack scaffold → creative core → quality bar. */
function brief(core: string): string {
  return `${STACK}\n\n${core.trim()}\n\n${BAR}`;
}

export const RECIPES: WebsiteRecipe[] = [
  {
    id: "hero-3d-awwwards",
    name: "Hero 3D Awwwards",
    emoji: "🏆",
    style: "WebGL cinematico",
    layout: "Scroll-storytelling coreografato",
    description:
      "Il massimo: hero WebGL con shader, split-text reveal, scroll coreografato sezione per sezione.",
    accent: "#8b5cf6",
    skillIds: [
      "taste",
      "web3d",
      "gsap-motion",
      "smooth-scroll",
      "creative-3d",
      "hero-page",
      "type-color",
      "impeccable",
    ],
    prompt:
      brief(`Costruisci un SITO DA AWWWARDS SOTD — non un template: un pezzo d'arte interattivo con una direzione creativa forte. Prima di scrivere codice, dichiara in un commento il CONCEPT in una frase (es. "materia liquida che si cristallizza in prodotto") e falla guidare OGNI scelta.

HERO (il momento firma — dedicagli il massimo sforzo):
- Canvas WebGL full-viewport con React Three Fiber: una scena UNICA legata al concept (es. mesh distorta da un vertex shader con noise, campo di particelle organizzato, oggetto iridescente con MeshTransmissionMaterial di drei). NON una primitiva di default che ruota.
- Il soggetto 3D reagisce al mouse (parallax morbido via useFrame + lerp) e ALLO SCROLL (la scena si trasforma mentre entri nella sezione successiva — collega il progress di ScrollTrigger a rotazione/morph/uniform dello shader).
- Titolo sovrapposto con SPLIT-TEXT REVEAL: caratteri che entrano con stagger (30–50ms), ease expo.out, leggero blur→sharp. Font display con carattere, kerning stretto.
- Micro-dettagli: cursore magnetico sui CTA, indicatore di scroll animato, grain/noise overlay sottile (opacity 3–5%).

SCROLL STORYTELLING (ogni sezione un capitolo, coreografato):
- Lenis smooth scroll sincronizzato con ScrollTrigger (lenis.on('scroll', ScrollTrigger.update) + gsap.ticker).
- Almeno UNA sezione PINNATA con scrub: mentre scrolli una sequenza si compie (numeri che contano, immagine che si espande da thumbnail a full-bleed, o il soggetto 3D che si smonta/rimonta).
- Reveal a stagger per testi e card (ScrollTrigger.batch, once: true); immagini con parallax interno (translateY inverso, overflow hidden).
- Transizioni di colore di sfondo tra sezioni animate via scroll (il sito "respira").

QUALITÀ NON NEGOZIABILE:
- 60fps: solo transform/opacity fuori dal canvas; bundle 3D lazy (React.lazy + Suspense con poster); DPR cap a 2.
- prefers-reduced-motion: hero statico (poster), timelines disattivate, contenuto comunque completo e bello.
- Le altre sezioni (about/lavori/contatti) mantengono la stessa firma visiva: stessa palette deliberata (MAI blu default), stesso font display, stessi easing.`),
  },
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

  /* ── Blender-first: asset modellati LIVE nella scena aperta dell'utente ── */
  {
    id: "blender-product-hero",
    name: "Product Hero 3D",
    emoji: "🛍️",
    style: "Product cinematic",
    layout: "Orbit · exploded view",
    description:
      "Landing di prodotto con il PRODOTTO modellato in Blender: orbita con lo scroll, si esplode nelle feature.",
    accent: "#f97316",
    category: "blender",
    skillIds: [
      "taste",
      "web3d",
      "creative-3d",
      "gsap-motion",
      "smooth-scroll",
      "hero-page",
      "type-color",
      "impeccable",
    ],
    prompt:
      blenderBrief(`Costruisci la LANDING DI UN PRODOTTO FISICO (scegli tu un prodotto credibile: cuffie premium, bottiglia di profumo, orologio, macchina per caffè…) dove il protagonista assoluto è il PRODOTTO MODELLATO IN BLENDER.
- In Blender: modella il prodotto in 3–6 parti nominate (es. corpo, tappo, dettaglio metallico), forme lavorate con bevel/subdivision, materiali PBR distinti (un metallo satinato, un vetro/plastica, un accento). Illumina mentalmente per uno studio shot: il modello deve reggere il primo piano.
- Hero: il prodotto in R3F su fondale studio (environment di drei + ombra da contatto), entra con una rotazione cinematica; al mouse un parallax morbido.
- Con lo SCROLL (ScrollTrigger scrub + Lenis): la camera ORBITA attorno al prodotto tra le sezioni; in una sezione pinnata il prodotto si ESPLODE (le parti si separano lungo assi puliti, ognuna con la sua etichetta-feature che appare in stagger) e si riassembla proseguendo.
- Sezioni: nav minimale, hero prodotto, exploded-view pinnata delle feature, materiali/dettagli (macro close-up con camera più stretta), specifiche, CTA acquisto, footer.
- Copy da brand di fascia alta: poche parole, precise, niente marketing gonfio.`),
  },
  {
    id: "blender-lowpoly-world",
    name: "Mondo Low-Poly",
    emoji: "🏝️",
    style: "Low-poly diorama",
    layout: "Fly-through · story",
    description:
      "Un diorama low-poly modellato in Blender; la camera ci vola dentro mentre scrolli, ogni tappa un capitolo.",
    accent: "#22c55e",
    category: "blender",
    skillIds: [
      "taste",
      "web3d",
      "creative-3d",
      "gsap-motion",
      "smooth-scroll",
      "scroll-media",
      "type-color",
    ],
    prompt:
      blenderBrief(`Costruisci un SITO-VIAGGIO IMMERSIVO (per una destinazione, un festival, un'app di viaggi o un mondo di gioco) il cui cuore è un DIORAMA LOW-POLY modellato in Blender.
- In Blender: un'isola/scena low-poly flat-shaded (terreno sfaccettato, 4–8 elementi iconici: alberi stilizzati, montagna, faro/tenda/edificio, acqua come piano con leggera emissione) su una palette di 5–6 colori DELIBERATA (materiali flat, niente texture). Raggruppa per zone nominate: zona-1, zona-2, zona-3.
- Hero: il diorama fluttua su fondale a gradiente; rotazione idle lentissima, nuvole/particelle minime attorno.
- Con lo SCROLL (una timeline ScrollTrigger scrub + Lenis): la CAMERA VOLA da zona a zona del diorama (waypoint con posizione+target interpolati con easing); a ogni tappa il pannello di testo del capitolo entra in stagger mentre la zona attiva si accende (emissive/scale leggero) e le altre si spengono.
- Sezioni = tappe del viaggio (3–4 capitoli) + intro e finale con CTA; il diorama resta fisso (canvas pinnato) e il racconto gli scorre sopra/accanto.
- Il resto della pagina eredita la palette del diorama: il sito e il mondo 3D devono sembrare UN unico oggetto.`),
  },
  {
    id: "blender-crystal-luxury",
    name: "Gemma Iridescente",
    emoji: "💎",
    style: "Luxury · transmission",
    layout: "Centered · scroll morph",
    description:
      "Brand di lusso attorno a una gemma sfaccettata modellata in Blender, vetro iridescente che muta con lo scroll.",
    accent: "#a855f7",
    category: "blender",
    skillIds: [
      "taste",
      "web3d",
      "creative-3d",
      "glass-aurora",
      "hero-page",
      "motion-react",
      "type-color",
    ],
    prompt:
      blenderBrief(`Costruisci il sito di un BRAND DI LUSSO (gioielleria, profumo d'autore, label di design) costruito attorno a UNA GEMMA/SCULTURA ASTRATTA modellata in Blender.
- In Blender: una forma sfaccettata unica — parti da un solido, taglia sfaccettature irregolari (bevel + decimate/planar o edit manuale), NON un'icosfera di default. Una sola mesh pulita, origine centrata: il materiale "wow" lo farà R3F.
- In R3F: MeshTransmissionMaterial di drei (transmission, roughness bassa, thickness, chromaticAberration, ior) su environment scuro elegante — la gemma rifrange la luce come vetro vivo. Rotazione idle lenta + parallax mouse via lerp.
- Con lo SCROLL: la gemma MUTA tra le sezioni (rotazione mirata, scale, colore/ior animati via ScrollTrigger) e la palette della pagina cambia con lei (transizioni di sfondo sincronizzate: il sito "respira" con la gemma).
- Tipografia da maison: display serif/didone raffinato in grande, sans quieto per il body, MAIUSCOLETTO spaziato per le label; tanto nero-non-nero e whitespace.
- Sezioni: hero con la gemma centrale e titolo che la attraversa (testo davanti/dietro con depth), storia del brand, collezione (3 varianti della gemma con materiali diversi), craft/dettagli, contatti su invito, footer minimale.`),
  },
  {
    id: "blender-mascot-brand",
    name: "Mascotte 3D",
    emoji: "🤖",
    style: "Playful · character",
    layout: "Hero mascotte · Z-flow",
    description:
      "Un personaggio-mascotte modellato in Blender che segue il cursore e reagisce: il brand prende vita.",
    accent: "#06b6d4",
    category: "blender",
    skillIds: [
      "taste",
      "web3d",
      "creative-3d",
      "micro-interactions",
      "emil-motion",
      "hero-page",
      "type-color",
    ],
    prompt:
      blenderBrief(`Costruisci il sito di un prodotto dev-tool o app consumer con una MASCOTTE 3D modellata in Blender come volto del brand.
- In Blender: un personaggio SEMPLICE e iconico (robot tondo, blob con occhi, animaletto geometrico) da 3–6 mesh nominate: corpo, testa, occhi separati (serviranno per il tracking), 1–2 dettagli (antenna, badge). Forme morbide (subdivision + smooth), palette di 3–4 colori del brand, proporzioni carine (testa grande).
- In R3F: la TESTA/GLI OCCHI SEGUONO IL CURSORE (lookAt ammorbidito con lerp — mai scattoso), idle bob sinusoidale sul corpo, blink periodico degli occhi (scale Y). Al click/hover della CTA la mascotte reagisce (salto+squash-and-stretch, particelle brevi).
- La mascotte RICOMPARE lungo la pagina in momenti chiave (accanto a una feature, che "regge" una card, che saluta nel footer) — stesso canvas riposizionato o istanze coerenti, mai sparita dopo l'hero.
- Micro-interazioni ovunque (bottoni magnetici, hover con spring fisico via Motion) in sintonia col carattere giocoso; però layout e tipografia RESTANO disciplinati e ariosi — giocoso NON significa caotico.
- Sezioni: hero con mascotte interattiva + headline, feature a percorso Z con la mascotte che accompagna, social proof, pricing semplice, CTA finale con la reazione più divertente, footer con saluto.`),
  },
  {
    id: "blender-exploded-showroom",
    name: "Showroom Esploso",
    emoji: "⚙️",
    style: "Tech industrial",
    layout: "Pinned · assembly story",
    description:
      "Sito enterprise per hardware: l'assieme modellato in Blender si smonta pezzo per pezzo raccontando l'ingegneria.",
    accent: "#ef4444",
    category: "blender",
    skillIds: [
      "taste",
      "web3d",
      "creative-3d",
      "gsap-motion",
      "smooth-scroll",
      "scroll-media",
      "web-architect",
      "impeccable",
    ],
    prompt: `${STACK}\n\n${BLENDER_PIPELINE}\n\n${`Costruisci il sito ENTERPRISE di un'azienda hardware/ingegneria (drone industriale, e-bike, dispositivo IoT, macchina utensile) il cui momento-firma è l'ASSIEME TECNICO modellato in Blender che si SMONTA raccontando l'ingegneria.
- In Blender: il prodotto come ASSIEME di 5–8 parti nominate e sensate (telaio, motore, batteria, scheda, scocca…), ognuna con il suo materiale PBR (alluminio, policarbonato, PCB scuro, gomma); l'insieme deve leggersi come un oggetto ingegnerizzato, non un giocattolo.
- Hero: l'assieme completo che ruota lento su fondale tecnico scuro (griglia hairline appena visibile), headline dura e precisa.
- La sezione-firma PINNATA (ScrollTrigger scrub + Lenis): scrollando l'assieme si ESPLODE progressivamente lungo assi puliti — ogni parte che si separa attiva la sua scheda tecnica (nome, spec, materiale) con linea-callout che la connette al pezzo; a fine sezione si RIASSEMBLA con uno snap soddisfacente.
- Ambiente da configuratore: piccola UI in overlay per variante colore (2–3 finiture che cambiano i materiali del modello live).
- Copy ingegneristico credibile: numeri, tolleranze, certificazioni — niente frasi vuote.`.trim()}\n\n${ENTERPRISE}\n\n${BAR}`,
  },
];
