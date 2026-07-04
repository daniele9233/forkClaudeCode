import { describe, it, expect, beforeEach } from "vitest";
import { useQAStore } from "./qa.store";

describe("qa.store", () => {
  beforeEach(() => useQAStore.getState().clear());

  it("setFindings opens the drawer, marks ran, stops scanning", () => {
    useQAStore.getState().setScanning(true);
    useQAStore.getState().setFindings([{ rule: "img-alt", message: "no alt" }]);
    const s = useQAStore.getState();
    expect(s.findings).toHaveLength(1);
    expect(s.scanning).toBe(false);
    expect(s.ran).toBe(true);
    expect(s.open).toBe(true);
  });

  it("clear resets everything", () => {
    useQAStore.getState().setFindings([{ rule: "x", message: "y" }]);
    useQAStore.getState().clear();
    const s = useQAStore.getState();
    expect(s.findings).toHaveLength(0);
    expect(s.ran).toBe(false);
    expect(s.open).toBe(false);
  });
});
