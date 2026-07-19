/**
 * Pure helpers to keep VOLATILE tool/MCP-availability state out of the
 * long-term project memory. A stale "Blender MCP not configured" line, once
 * distilled into AGENTS.md, is injected into every future session and makes the
 * agent WRONGLY refuse to use a tool that is actually connected. These run as a
 * belt-and-braces filter alongside the distiller's prompt rule. No imports on
 * purpose — trivially unit-testable.
 */

/** A memory line that asserts the availability/configuration state of a tool. */
export function isToolStateLine(line: string): boolean {
  const l = line.toLowerCase();
  const mentionsToolLayer = /\bmcp\b|blender|figma|playwright|21st|\btools?\b/.test(l);
  const mentionsAvailability =
    /config(ured|urato)?|conness|connect|disconnect|available|unavailable|non è disponibil|non disponibil|not available|not connected|disponibil|install|needs? (a )?restart|riavv|abilitat|enabled|disabled/.test(
      l,
    );
  return mentionsToolLayer && mentionsAvailability;
}

/** Drop every tool/MCP-availability line from a memory block. */
export function stripToolStateLines(memory: string): string {
  return memory
    .split("\n")
    .filter((l) => !isToolStateLine(l))
    .join("\n");
}
