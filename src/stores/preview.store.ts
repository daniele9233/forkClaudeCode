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

  setDetectedUrl: (url: string) => void;
  /** Open the panel. With a URL it loads it; without, it shows the empty state. */
  openPreview: (url?: string) => void;
  closePreview: () => void;
  dismissDetected: () => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  detectedUrl: null,
  previewOpen: false,
  previewUrl: null,
  dismissed: false,

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
    })),
  closePreview: () => set({ previewOpen: false }),
  dismissDetected: () => set({ dismissed: true }),
}));
