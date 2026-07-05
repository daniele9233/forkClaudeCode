import { describe, it, expect, beforeEach } from "vitest";
import { matchSkills, resolveSlash, planInjection } from "./match";
import { SKILLS } from "./catalog";
import { useSkillsStore } from "@/stores/skills.store";

const allIds = SKILLS.map((s) => s.id);

function resetStore() {
  useSkillsStore.setState({
    enabled: allIds,
    autoApply: true,
    webDesigner: true,
    custom: [],
    pinned: [],
    sticky: {},
  });
}

describe("negative keywords", () => {
  it("suppresses motion when the user says 'senza animazioni'", () => {
    const hits = matchSkills("crea un sito senza animazioni", allIds, 3);
    expect(hits.some((s) => s.id === "emil-motion")).toBe(false);
  });
});

describe("mutual exclusion", () => {
  it("never returns two conflicting style skills together", () => {
    const hits = matchSkills("voglio uno stile neubrutalism e minimalism", allIds, 2);
    const ids = hits.map((s) => s.id);
    expect(ids.includes("neubrutalism") && ids.includes("minimalism")).toBe(false);
  });
});

describe("synonyms / phrases", () => {
  it("matches motion from a phrase without the exact keyword", () => {
    const hits = matchSkills(
      "fai muovere questo elemento con un effetto fade",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "emil-motion")).toBe(true);
  });
});

describe("asset & media skills", () => {
  it("triggers scroll-media on scroll video / sequence intent", () => {
    const hits = matchSkills(
      "voglio uno scroll video con image sequence frame by frame",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "scroll-media")).toBe(true);
  });
  it("triggers asset-generation on image intent", () => {
    const hits = matchSkills("aggiungi immagini hero reali senza placeholder", allIds, 3);
    expect(hits.some((s) => s.id === "asset-generation")).toBe(true);
  });
});

describe("vertical skills (devops / docs / jobs)", () => {
  it("triggers devops on infra intent", () => {
    const hits = matchSkills(
      "scrivi un playbook ansible e un manifest kubernetes",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "devops")).toBe(true);
  });
  it("triggers doc-engineering on PDF/OCR intent", () => {
    const hits = matchSkills(
      "estrai i dati da questo PDF scansionato con OCR",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "doc-engineering")).toBe(true);
  });
  it("triggers job-search on CV/job intent", () => {
    const hits = matchSkills(
      "fai il parsing del CV e cerca offerte di lavoro",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "job-search")).toBe(true);
  });
  it("triggers rke2-rancher on RKE2/Rancher intent", () => {
    const hits = matchSkills(
      "installa un cluster rke2 con rancher e longhorn",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "rke2-rancher")).toBe(true);
  });
  it("triggers work-docs on deliverable intent", () => {
    const hits = matchSkills(
      "prepara un verbale di consegna in docx per il cliente",
      allIds,
      3,
    );
    expect(hits.some((s) => s.id === "work-docs")).toBe(true);
  });
});

describe("slash commands", () => {
  it("forces a skill and strips the command", () => {
    const r = resolveSlash("/motion fai un bottone che pulsa", allIds);
    expect(r?.skill.id).toBe("emil-motion");
    expect(r?.clean).toBe("fai un bottone che pulsa");
  });
  it("ignores a lone command with no task", () => {
    expect(resolveSlash("/motion", allIds)).toBeNull();
  });
});

describe("planInjection: sticky + pinned", () => {
  beforeEach(resetStore);

  it("keeps a matched skill warm on a follow-up prompt with no keywords", () => {
    const first = planInjection("aggiungi delle animazioni fluide al bottone");
    expect(first.freshIds).toContain("emil-motion");
    useSkillsStore.getState().noteActivated(first.freshIds);

    // Second prompt has no motion keywords — sticky should carry it.
    const second = planInjection("ora fallo diventare rosso");
    const motion = second.planned.find((p) => p.skill.id === "emil-motion");
    expect(motion?.source).toBe("sticky");
  });

  it("sticky decays to nothing after enough quiet turns", () => {
    const first = planInjection("animazioni");
    useSkillsStore.getState().noteActivated(first.freshIds);
    // 3 quiet turns (STICKY_TURNS) → gone.
    for (let i = 0; i < 3; i++) useSkillsStore.getState().noteActivated([]);
    const later = planInjection("cambia il testo");
    expect(later.planned.some((p) => p.skill.id === "emil-motion")).toBe(false);
  });

  it("pinned skills always apply regardless of the prompt", () => {
    useSkillsStore.getState().togglePin("bento-grid");
    const plan = planInjection("scrivi una funzione qualsiasi");
    const bento = plan.planned.find((p) => p.skill.id === "bento-grid");
    expect(bento?.source).toBe("pinned");
  });

  it("force-injects a recipe's FULL skill stack (bypasses the 2-cap)", () => {
    const forced = ["web-architect", "bento-grid", "impeccable", "type-color"];
    // Neutral prompt so nothing matches by keyword — all come from `forced`.
    const plan = planInjection("procedi", forced);
    const ids = plan.planned.map((p) => p.skill.id);
    for (const id of forced) expect(ids).toContain(id);
    // Forced recipe skills carry source "recipe" and are NOT marked sticky.
    expect(plan.planned.find((p) => p.skill.id === "bento-grid")?.source).toBe("recipe");
    expect(plan.freshIds).toHaveLength(0);
  });
});
