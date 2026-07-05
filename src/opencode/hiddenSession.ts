import type { TextPartInput, FilePartInput } from "@opencode-ai/sdk/client";
import { getClient } from "./client";
import { markSilent, unmarkSilent } from "./silentSessions";
import { useModelStore, splitModel } from "@/stores/model.store";

/**
 * Run a throwaway hidden session in plan mode (read-only, no side effects) with
 * the given parts, using the user's selected model, and return the assistant's
 * joined text. The session is title-tagged `[kikko]` (hidden from the sidebar),
 * silenced (event handlers ignore it) and deleted afterwards.
 *
 * Shared by the memory distiller, the prompt enhancer and the style capture —
 * one place for the create → prompt → collect → delete plumbing.
 */
export async function runHiddenPlan(
  title: string,
  parts: Array<TextPartInput | FilePartInput>,
): Promise<string> {
  let hiddenId: string | null = null;
  try {
    const created = await getClient().session.create({
      body: { title },
      throwOnError: true,
    });
    hiddenId = created.data!.id;
    markSilent(hiddenId);

    const { providerID, modelID } = splitModel(useModelStore.getState().selected ?? "");
    const res = await getClient().session.prompt({
      path: { id: hiddenId },
      body: {
        parts,
        agent: "plan",
        ...(providerID && modelID ? { model: { providerID, modelID } } : {}),
      },
      throwOnError: true,
    });

    const out = (res.data?.parts ?? []) as Array<{ type: string; text?: string }>;
    return out
      .filter((p) => p.type === "text" && typeof p.text === "string")
      .map((p) => p.text)
      .join("\n");
  } finally {
    if (hiddenId) {
      const id = hiddenId;
      getClient()
        .session.delete({ path: { id } })
        .catch(() => {
          /* the sidebar filters [kikko] sessions anyway */
        })
        .finally(() => unmarkSilent(id));
    }
  }
}
