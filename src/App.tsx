import { useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ChatShell } from "@/features/chat/ChatShell";
import { FileTree } from "@/features/filetree/FileTree";
import { FileDiffPanel } from "@/features/filetree/FileDiffPanel";
import { TerminalPanel } from "@/features/terminal/TerminalPanel";
import { PreviewPanel } from "@/features/preview/PreviewPanel";
import { ContextInspectorPanel } from "@/features/inspector/ContextInspectorPanel";
import { ContextSparkline } from "@/features/inspector/ContextSparkline";
import { CheckpointTimeline } from "@/features/checkpoints/CheckpointTimeline";
import { CommandPalette } from "@/features/commandpalette/CommandPalette";
import { StatusBar } from "@/features/statusbar/StatusBar";
import { SidecarStatusBanner } from "@/features/statusbar/SidecarStatusBanner";
import { EngineVersionBanner } from "@/features/statusbar/EngineVersionBanner";
import { OnboardingWizard } from "@/features/onboarding/OnboardingWizard";
import { SettingsModal } from "@/features/settings/SettingsModal";
import { useUIStore, type BottomTab } from "@/stores/ui.store";
import { useFileStore } from "@/stores/file.store";
import { usePreviewStore } from "@/stores/preview.store";
import { useSessionStore } from "@/stores/session.store";
import { useOnboardingStore } from "@/stores/onboarding.store";
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
        "border-b-2 px-3 py-1.5 text-[10px] font-medium uppercase tracking-widest transition-colors",
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
  const {
    bottomOpen,
    bottomTab,
    setBottomTab,
    closeBottom,
    commandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    settingsOpen,
    openSettings,
    closeSettings,
  } = useUIStore();
  const selectedFilePath = useFileStore((s) => s.selectedFilePath);
  const previewUrl = usePreviewStore((s) => s.previewUrl);
  const reduce = useReducedMotion();
  const sidecarStatus = useSessionStore((s) => s.sidecarStatus);
  const onboardingDone = useOnboardingStore((s) => s.completed);
  // Show the first-run wizard once the engine is up (so the provider step can
  // talk to it), and only if the user hasn't completed/skipped it before.
  const showOnboarding = !onboardingDone && sidecarStatus === "ready";

  // If the open file is closed while the diff tab is active, fall back to terminal.
  useEffect(() => {
    if (!selectedFilePath && bottomTab === "diff") {
      setBottomTab("terminal");
    }
  }, [selectedFilePath, bottomTab, setBottomTab]);

  // Global Ctrl+K / Cmd+K → command palette
  const handleGlobalKey = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
    },
    [commandPaletteOpen, openCommandPalette, closeCommandPalette],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleGlobalKey);
    return () => document.removeEventListener("keydown", handleGlobalKey);
  }, [handleGlobalKey]);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-full flex-col overflow-hidden"
    >
      {/* Global engine status (connecting / disconnected) */}
      <SidecarStatusBanner />
      <EngineVersionBanner />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left sidebar: sessions (top) + file tree + context sparkline */}
        <div className="glass flex h-full w-64 shrink-0 flex-col border-r border-[var(--border)]">
          <div className="shrink-0 overflow-hidden" style={{ maxHeight: "42%" }}>
            <SessionSidebar />
          </div>
          <div className="h-px shrink-0 bg-[var(--border)]" />
          <div className="min-h-0 flex-1 overflow-hidden">
            <FileTree />
          </div>
          <ContextSparkline />
        </div>

        {/* Main area: chat + bottom panel + status bar */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatShell onOpenSettings={openSettings} />
          </div>

          {bottomOpen && (
            <>
              <div className="h-px shrink-0 bg-[var(--border)]" />
              <div className="glass flex h-[42vh] shrink-0 flex-col">
                {/* Tab bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] pr-2">
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
                    <BottomTabButton
                      tab="timeline"
                      label="Timeline"
                      active={bottomTab === "timeline"}
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
                    className={cn(
                      "h-full",
                      bottomTab === "terminal" ? "block" : "hidden",
                    )}
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
                    className={cn(
                      "h-full",
                      bottomTab === "inspector" ? "block" : "hidden",
                    )}
                  >
                    <ContextInspectorPanel />
                  </div>
                  <div
                    className={cn(
                      "h-full",
                      bottomTab === "timeline" ? "block" : "hidden",
                    )}
                  >
                    <CheckpointTimeline />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Status bar — always visible */}
          <StatusBar />
        </main>

        {/* Right column: web preview */}
        {previewUrl && <PreviewPanel />}
      </div>

      {/* Global overlays */}
      {commandPaletteOpen && <CommandPalette onOpenSettings={openSettings} />}
      {settingsOpen && <SettingsModal onClose={closeSettings} />}
      {showOnboarding && <OnboardingWizard />}
    </motion.div>
  );
}
