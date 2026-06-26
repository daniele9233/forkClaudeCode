import { create } from "zustand";

interface FileState {
  /** Path of the file currently open in the diff/editor panel. */
  selectedFilePath: string | null;
  setSelectedFilePath: (path: string | null) => void;
}

export const useFileStore = create<FileState>((set) => ({
  selectedFilePath: null,
  setSelectedFilePath: (path) => set({ selectedFilePath: path }),
}));
