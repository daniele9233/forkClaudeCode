import { useEffect } from "react";
import { X } from "lucide-react";
import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ChatShell } from "@/features/chat/ChatShell";
import { FileTree } from "@/features/filetree/FileTree";
import { FileDiffPanel } from "@/features/filetree/FileDiffPanel";
import { TerminalPanel } from "@/features/terminal/TerminalPanel";
import { PreviewPanel } from "@/features/preview/PreviewPanel";
import { ContextInspectorPanel } from "@/features/inspector/ContextInspectorPanel";
import { useUIStore, type BottomTab } from "@/stores/ui.store";
import { useFileStore } from "@/stores/file.store";
import { usePreviewStore } from "@/stores/preview.store";
import { cn } from "@/lib/utils";

function BottomTabButton({
  tab,
  label,
  active,
  onClick,
}: {
  tab: BottomTab;
  label: string;
  active: boolean;
  onClick: (tab: BottomTab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={cn(
        "border-b-2 px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-[var(--primary)] text-[var(--foreground)]"
          : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
      )}
    >
      {label}
    </button>
  );
}

export default function App() {
  const { bottomOpen, bottomTab, setBottomTab, closeBottom } = useUIStore();
  const selectedFilePath = useFileStore((s) => s.selectedFilePath);
  const previewUrl = usePreviewStore((s) => s.previewUrl);

  // If the open file is closed while the diff tab is active, fall back to terminal.
  useEffect(() => {
    if (!selectedFilePath && bottomTab === "diff") {
      setBottomTab("terminal");
    }
  }, [selectedFilePath, bottomTab, setBottomTab]);

  return (
    <div className="flex h-full overflow-hidden bg-[var(--background)]">
      {/* Left sidebar: sessions (top) + file tree (bottom) */}
      <div className="flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)]">
        <div className="shrink-0 overflow-hidden" style={{ maxHeight: "45%" }}>
          <SessionSidebar />
        </div>
        <div className="h-px shrink-0 bg-[var(--border)]" />
        <div className="min-h-0 flex-1 overflow-hidden">
          <FileTree />
        </div>
      </div>

      {/* Main area: chat (top, flex-1) + bottom panel (terminal / diff / inspector) */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatShell />
        </div>

        {bottomOpen && (
          <>
            <div className="h-px shrink-0 bg-[var(--border)]" />
            <div className="flex h-[42vh] shrink-0 flex-col">
              {/* Tab bar */}
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--background)] pr-2">
                <div className="flex items-center">
                  <BottomTabButton
                    tab="terminal"
                    label="Terminal"
                    active={bottomTab === "terminal"}
                    onClick={setBottomTab}
                  />
                  {selectedFilePath && (
                    <BottomTabButton
                      tab="diff"
                      label="Diff"
                      active={bottomTab === "diff"}
                      onClick={setBottomTab}
                    />
                  )}
                  <BottomTabButton
                    tab="inspector"
                    label="Inspector"
                    active={bottomTab === "inspector"}
                    onClick={setBottomTab}
                  />
                </div>
                <button
                  onClick={closeBottom}
                  className="rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  title="Close panel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Panel body — terminal stays mounted to preserve scrollback */}
              <div className="min-h-0 flex-1">
                <div
                  className={cn("h-full", bottomTab === "terminal" ? "block" : "hidden")}
                >
                  <TerminalPanel />
                </div>
                {selectedFilePath && (
                  <div
                    className={cn("h-full", bottomTab === "diff" ? "block" : "hidden")}
                  >
                    <FileDiffPanel />
                  </div>
                )}
                <div
                  className={cn("h-full", bottomTab === "inspector" ? "block" : "hidden")}
                >
                  <ContextInspectorPanel />
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Right column: web preview (Fase 4.3) */}
      {previewUrl && <PreviewPanel />}
    </div>
  );
}
