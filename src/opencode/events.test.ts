import { describe, it, expect } from "vitest";
import type { Event } from "@opencode-ai/sdk/client";
import { isEventType } from "./events";

describe("events — isEventType", () => {
  it("narrows by the type discriminant", () => {
    const idle = { type: "session.idle", properties: { sessionID: "s1" } } as Event;
    expect(isEventType(idle, "session.idle")).toBe(true);
    expect(isEventType(idle, "message.updated")).toBe(false);
  });

  it("does not match a different event type", () => {
    const updated = {
      type: "message.updated",
      properties: { info: { id: "m1" } },
    } as unknown as Event;
    expect(isEventType(updated, "session.idle")).toBe(false);
    expect(isEventType(updated, "message.updated")).toBe(true);
  });
});
