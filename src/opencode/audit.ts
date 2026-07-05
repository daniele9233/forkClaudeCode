import { invoke } from "@tauri-apps/api/core";
import type { FilePartInput } from "@opencode-ai/sdk/client";
import { getClient } from "./client";
import { useChatStore } from "@/stores/chat.store";
import { useModelStore, splitModel } from "@/stores/model.store";
import { toFileUrl } from "@/lib/utils";

/** The breakpoints a real team checks — captured and handed to the agent. */
const VIEWPORTS = [
  { label: "mobile", w: 390, h: 844 },
  { label: "tablet", w: 768, h: 1024 },
  { label: "desktop", w: 1440, h: 900 },
] as const;

function auditPrompt(url: string): string {
  return `Attached are 3 screenshots of ${url} at MOBILE (390px), TABLET (768px) and DESKTOP (1440px). Run a rigorous MULTI-VIEWPORT DESIGN AUDIT as a senior front-end team, then APPLY the fixes to the code.

Score /10 and list concrete issues per area:
1. Responsiveness — does each breakpoint look intentional? overflow, cramped/oversized text, broken grids, tap targets < 44px, wasted space? (compare the 3 shots)
2. Typography — distinctive typeface (NOT Inter/Arial/defaults)? modular scale? fluid sizing across viewports?
3. Color & contrast — tinted neutrals (no pure #000/#fff)? one accent? text contrast ≥ 4.5:1 (AA)?
4. Layout & spacing — clear focal point, 8pt rhythm, optical alignment, whitespace; not everything nested in cards?
5. Composition — varied section rhythm, not templated/monotonous?
6. States & motion — hover/focus/active/disabled/loading/empty/error; 150–250ms ease-out, no bounce, reduced-motion safe.

Fix everything below 8/10 now, mobile-first. Prioritize what removes the "AI-generated / templated" look. If you cannot see the images, say so explicitly instead of guessing.`;
}

/**
 * Capture the page at phone/tablet/desktop and send a rigorous design audit to
 * `sessionId`, asking the agent to apply the fixes. Shared by the preview
 * "Audit" button and the autopilot's automatic post-build quality pass. Throws
 * if no screenshot could be taken.
 */
export async function runDesignAudit(sessionId: string, url: string): Promise<void> {
  const files: FilePartInput[] = [];
  for (const v of VIEWPORTS) {
    const path = await invoke<string>("capture_preview", {
      url,
      width: v.w,
      height: v.h,
    }).catch(() => null);
    if (path) {
      files.push({
        type: "file",
        mime: "image/png",
        filename: `${v.label}-${v.w}.png`,
        url: toFileUrl(path),
      });
    }
  }
  if (files.length === 0) {
    throw new Error("screenshot non riuscito (nessun browser headless?)");
  }

  useChatStore.getState().setSessionRunning(sessionId, true);
  try {
    const { providerID, modelID } = splitModel(useModelStore.getState().selected ?? "");
    await getClient().session.prompt({
      path: { id: sessionId },
      body: {
        parts: [{ type: "text", text: auditPrompt(url) }, ...files],
        agent: "build",
        ...(providerID && modelID ? { model: { providerID, modelID } } : {}),
      },
      throwOnError: true,
    });
  } catch (e) {
    useChatStore.getState().setSessionRunning(sessionId, false);
    throw e;
  }
}
