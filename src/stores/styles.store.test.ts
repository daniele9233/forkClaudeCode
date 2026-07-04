import { describe, it, expect, beforeEach } from "vitest";
import { useStylesStore, activeStyleDirective } from "./styles.store";

describe("styles.store", () => {
  beforeEach(() => useStylesStore.setState({ styles: [], activeId: null }));

  it("saves a style and pulls the accent hex from the spec", () => {
    const id = useStylesStore
      .getState()
      .addStyle("Test", "Palette: accent #ff8800 on #0b0b12");
    const s = useStylesStore.getState().styles.find((x) => x.id === id);
    expect(s?.name).toBe("Test");
    expect(s?.accent).toBe("#ff8800");
  });

  it("only injects a directive when a style is active", () => {
    const id = useStylesStore.getState().addStyle("Brand", "## Theme\nbold and warm");
    expect(activeStyleDirective()).toBeNull();
    useStylesStore.getState().setActive(id);
    const dir = activeStyleDirective();
    expect(dir).toContain("SAVED DESIGN SYSTEM");
    expect(dir).toContain("bold and warm");
  });

  it("removing the active style clears activeId", () => {
    const id = useStylesStore.getState().addStyle("X", "spec spec spec");
    useStylesStore.getState().setActive(id);
    useStylesStore.getState().removeStyle(id);
    expect(useStylesStore.getState().activeId).toBeNull();
  });
});
