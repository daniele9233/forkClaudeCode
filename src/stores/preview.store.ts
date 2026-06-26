import { create } from "zustand";

interface PreviewState {
  /** Last dev-server URL detected in command output (suggestion). */
  detectedUrl: string | null;
  /** URL currently loaded in the preview webview (null = preview closed). */
  previewUrl: string | null;
  /** User dismissed the current detection banner. */
  dismissed: boolean;

  setDetectedUrl: (url: string) => void;
  openPreview: (url: string) => void;
  closePreview: () => void;
  dismissDetected: () => void;
}

export const usePreviewStore = create<PreviewState>((set, get) => ({
  detectedUrl: null,
  previewUrl: null,
  dismissed: false,

  setDetectedUrl: (url) => {
    const { detectedUrl, previewUrl } = get();
    // Ignore if unchanged or already being previewed.
    if (url === detectedUrl || url === previewUrl) return;
    set({ detectedUrl: url, dismissed: false });
  },

  openPreview: (url) => set({ previewUrl: url, dismissed: true }),
  closePreview: () => set({ previewUrl: null }),
  dismissDetected: () => set({ dismissed: true }),
}));
