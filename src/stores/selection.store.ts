import { create } from "zustand";

export interface SelectedElement {
  /** Source location — present only when the page exposes it (React dev with
   *  _debugSource, or data-forgia-loc attributes). */
  file?: string;
  line?: number;
  col?: number;
  /** CSS selector path — always present, works on any framework/plain HTML. */
  selector?: string;
  /** Visible text snippet of the element, to help the agent locate it. */
  text?: string;
  tagName: string;
  outerHTML: string;
}

interface SelectionState {
  selectionMode: boolean;
  hoveredElement: SelectedElement | null;
  selectedElement: SelectedElement | null;
  composeText: string;
  inspectorReady: boolean;

  toggleSelectionMode: () => void;
  setSelectionMode: (mode: boolean) => void;
  setHoveredElement: (el: SelectedElement | null) => void;
  setSelectedElement: (el: SelectedElement | null) => void;
  setComposeText: (text: string) => void;
  setInspectorReady: (ready: boolean) => void;
  clearSelection: () => void;
}

export const useSelectionStore = create<SelectionState>((set) => ({
  selectionMode: false,
  hoveredElement: null,
  selectedElement: null,
  composeText: "",
  inspectorReady: false,

  toggleSelectionMode: () =>
    set((s) => ({
      selectionMode: !s.selectionMode,
      hoveredElement: null,
      selectedElement: null,
    })),
  setSelectionMode: (mode) =>
    set({ selectionMode: mode, hoveredElement: null, selectedElement: null }),
  setHoveredElement: (el) => set({ hoveredElement: el }),
  setSelectedElement: (el) => set({ selectedElement: el, hoveredElement: null }),
  setComposeText: (text) => set({ composeText: text }),
  setInspectorReady: (ready) => set({ inspectorReady: ready }),
  clearSelection: () =>
    set({ selectedElement: null, hoveredElement: null, composeText: "" }),
}));
