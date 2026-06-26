import { create } from "zustand";
import { useUIStore } from "./ui.store";

interface FileState {
  /** Path of the file currently open in the diff/editor panel. */
  selectedFilePath: string | null;
  /** Line to reveal and highlight when the editor mounts. null = no specific line. */
  selectedLine: number | null;

  setSelectedFilePath: (path: string | null) => void;
  /** Open a file at an optional line number. Replaces both path and line atomically. */
  openFile: (path: string | null, line?: number | null) => void;
}

export const useFileStore = create<FileState>((set) => ({
  selectedFilePath: null,
  selectedLine: null,
  setSelectedFilePath: (path) => set({ selectedFilePath: path, selectedLine: null }),
  openFile: (path, line = null) => {
    set({ selectedFilePath: path, selectedLine: line ?? null });
    // Surface the diff panel when a file is opened.
    if (path) useUIStore.getState().openBottom("diff");
  },
}));
