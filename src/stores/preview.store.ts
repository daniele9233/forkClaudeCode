import { create } from "zustand";

interface PreviewState {
  /** Last dev-server URL detected in command output (suggestion). */
  detectedUrl: string | null;
  /** Whether the preview panel is open (independent of whether a URL is set). */
  previewOpen: boolean;
  /** URL currently loaded in the preview (null = nothing to show yet). */
  previewUrl: string | null;
  /** User dismissed the current detection banner. */
  dismissed: boolean;
  /** The user explicitly closed the preview — suppresses auto-open until they
   *  open it again (so we don't fight them mid-conversation). */
  closedByUser: boolean;
  /** Bumped to force the iframe to reload (e.g. after the agent edits files). */
  reloadNonce: number;

  setDetectedUrl: (url: string) => void;
  /** Open the panel. With a URL it loads it; without, it shows the empty state. */
  openPreview: (url?: string) => void;
  closePreview: () => void;
  dismissDetected: () => void;
  bumpReload: () => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  detectedUrl: null,
  previewOpen: false,
  previewUrl: null,
  dismissed: false,
  closedByUser: false,
  reloadNonce: 0,

  setDetectedUrl: (url) => {
    const { detectedUrl, previewUrl } = get();
    // Ignore if unchanged or already being previewed.
    if (url === detectedUrl || url === previewUrl) return;
    set({ detectedUrl: url, dismissed: false });
  },

  openPreview: (url) =>
    set((s) => ({
      previewOpen: true,
      previewUrl: url ?? s.previewUrl,
      dismissed: true,
      closedByUser: false,
    })),
  closePreview: () => set({ previewOpen: false, closedByUser: true }),
  dismissDetected: () => set({ dismissed: true }),
  bumpReload: () => set((s) => ({ reloadNonce: s.reloadNonce + 1 })),
}));
