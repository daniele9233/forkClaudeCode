import { useConfig } from "./config";
import { useProviders } from "./context";
import { useModelStore } from "@/stores/model.store";

/**
 * Minimal shape we read off a provider's model entry for capability checks.
 * Matches the opencode 1.x `Model.capabilities` structure (a full SDK `Model`
 * is assignable to this).
 */
interface ModelCaps {
  capabilities?: {
    attachment?: boolean;
    input?: { image?: boolean };
  };
}

/**
 * Does this model accept image input (vision)? Prefer the precise `input.image`
 * signal; fall back to the broader `attachment` flag when it's absent.
 */
export function modelSupportsVision(model?: ModelCaps): boolean {
  const caps = model?.capabilities;
  if (!caps) return false;
  if (typeof caps.input?.image === "boolean") return caps.input.image;
  return !!caps.attachment;
}

/**
 * Vision capability of the currently selected model. `known` is false when we
 * can't find the model in the provider catalog (so callers can stay quiet
 * instead of claiming "no vision" wrongly).
 */
export function useModelVision(): { known: boolean; vision: boolean } {
  const { data: config } = useConfig();
  const { data: providers = [] } = useProviders();
  const localSelected = useModelStore((s) => s.selected);

  const model = localSelected ?? config?.model ?? "";
  const slash = model.indexOf("/");
  const providerId = slash > 0 ? model.slice(0, slash) : "";
  const modelId = slash > 0 ? model.slice(slash + 1) : model;
  const m = providers.find((p) => p.id === providerId)?.models?.[modelId] as
    ModelCaps | undefined;

  return { known: !!m, vision: modelSupportsVision(m) };
}
