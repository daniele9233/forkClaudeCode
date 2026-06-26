import { describe, it, expect, beforeEach } from "vitest";
import type { Permission } from "@opencode-ai/sdk/client";
import { usePermissionStore } from "./permission.store";

function perm(overrides: Partial<Permission> = {}): Permission {
  return {
    id: "perm1",
    type: "bash",
    sessionID: "s1",
    ...overrides,
  } as Permission;
}

function reset() {
  usePermissionStore.setState({ pending: new Map(), allowList: new Set() });
}

describe("permission.store (approvals)", () => {
  beforeEach(reset);

  it("adds and removes pending permissions by id", () => {
    const { addPending, removePending } = usePermissionStore.getState();
    addPending(perm({ id: "a" }));
    addPending(perm({ id: "b" }));
    expect(usePermissionStore.getState().pending.size).toBe(2);

    removePending("a");
    const pending = usePermissionStore.getState().pending;
    expect(pending.has("a")).toBe(false);
    expect(pending.has("b")).toBe(true);
  });

  it("isAutoAllowed matches by permission type", () => {
    const { addToAllowList, isAutoAllowed } = usePermissionStore.getState();
    expect(isAutoAllowed(perm({ type: "bash" }))).toBe(false);

    addToAllowList("bash");
    expect(usePermissionStore.getState().isAutoAllowed(perm({ type: "bash" }))).toBe(
      true,
    );
    expect(usePermissionStore.getState().isAutoAllowed(perm({ type: "edit" }))).toBe(
      false,
    );
  });

  it("isAutoAllowed matches by string pattern", () => {
    const { addToAllowList, isAutoAllowed } = usePermissionStore.getState();
    addToAllowList("git push");
    expect(
      usePermissionStore
        .getState()
        .isAutoAllowed(perm({ type: "bash", pattern: "git push" })),
    ).toBe(true);
    expect(isAutoAllowed(perm({ type: "bash", pattern: "rm -rf" }))).toBe(false);
  });

  it("isAutoAllowed matches when any pattern in an array is allowed", () => {
    const { addToAllowList } = usePermissionStore.getState();
    addToAllowList("npm test");
    const p = perm({ type: "bash", pattern: ["npm build", "npm test"] });
    expect(usePermissionStore.getState().isAutoAllowed(p)).toBe(true);
  });

  it("removeFromAllowList revokes auto-allow", () => {
    const { addToAllowList, removeFromAllowList } = usePermissionStore.getState();
    addToAllowList("bash");
    removeFromAllowList("bash");
    expect(usePermissionStore.getState().isAutoAllowed(perm({ type: "bash" }))).toBe(
      false,
    );
  });
});
