import { useEffect, useCallback, lazy, Suspense } from "react";
import { motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { SessionSidebar } from "@/features/sessions/SessionSidebar";
import { ProjectBar } from "@/features/project/ProjectBar";
import { ChatShell } from "@/features/chat/ChatShell";
import { FileTree } from "@/features/filetree/FileTree";
import { ContextSparkline } from "@/features/inspector/ContextSparkline";
import { StatusBar } from "@/features/statusbar/StatusBar";
import { SidecarStatusBanner } from "@/features/statusbar/SidecarStatusBanner";
import { EngineVersionBanner } from "@/features/statusbar/EngineVersionBanner";
import { useUIStore, type BottomTab } from "@/stores/ui.store";

// Heavy / conditionally-shown panels are code-split so they don't bloat the
// initial bundle (Monaco, xterm, preview, settings, overlays load on demand).
const FileDiffPanel = lazy(() =>
  import("@/features/filetree/FileDiffPanel").then((m) => ({ default: m.FileDiffPanel })),
);
const TerminalPanel = lazy(() =>
  import("@/features/terminal/TerminalPanel").then((m) => ({ default: m.TerminalPanel })),
);
const PreviewPanel = lazy(() =>
  import("@/features/preview/PreviewPanel").then((m) => ({ default: m.PreviewPanel })),
);
const ContextInspectorPanel = lazy(() =>
  import("@/features/inspector/ContextInspectorPanel").then((m) => ({
    default: m.ContextInspectorPanel,
  })),
);
const CheckpointTimeline = lazy(() =>
  import("@/features/checkpoints/CheckpointTimeline").then((m) => ({
    default: m.CheckpointTimeline,
  })),
);
const CommandPalette = lazy(() =>
  import("@/features/commandpalette/CommandPalette").then((m) => ({
    default: m.CommandPalette,
  })),
);
const SettingsModal = lazy(() =>
  import("@/features/settings/SettingsModal").then((m) => ({ default: m.SettingsModal })),
);
const ProjectPicker = lazy(() =>
  import("@/features/project/ProjectPicker").then((m) => ({ default: m.ProjectPicker })),
);
const OnboardingWizard = lazy(() =>
  import("@/features/onboarding/OnboardingWizard").then((m) => ({
    default: m.OnboardingWizard,
  })),
);
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
    bottomHeight,
    setBottomHeight,
    commandPaletteOpen,
    openCommandPalette,
    closeCommandPalette,
    settingsOpen,
    openSettings,
    closeSettings,
    projectPickerOpen,
    closeProjectPicker,
  } = useUIStore();
  const selectedFilePath = useFileStore((s) => s.selectedFilePath);
  const previewOpen = usePreviewStore((s) => s.previewOpen);
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

  // Drag the divider above the bottom panel to raise/lower it. The panel is
  // anchored to the bottom, so its height is the distance from the pointer up
  // to just above the ~28px status bar; clamped so the chat always keeps room.
  const startResize = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const onMove = (ev: PointerEvent) => {
        const next = window.innerHeight - ev.clientY - 28;
        const max = window.innerHeight * 0.82;
        setBottomHeight(Math.min(Math.max(next, 140), max));
      };
      const onUp = () => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      };
      document.body.style.userSelect = "none";
      document.body.style.cursor = "row-resize";
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [setBottomHeight],
  );

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
          <ProjectBar />
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
              {/* Drag handle — raise/lower the bottom panel. Tall, obvious grip
                  with a generous hit area so it's easy to grab. */}
              <div
                onPointerDown={startResize}
                className="group relative flex h-3 shrink-0 touch-none select-none items-center justify-center bg-[var(--border)]/60 transition-colors hover:bg-[var(--primary)]/30"
                style={{ cursor: "row-resize" }}
                title="Drag to resize the panel"
              >
                <span className="pointer-events-none h-1 w-10 rounded-full bg-[var(--muted-foreground)]/50 transition-colors group-hover:bg-[var(--primary)]" />
              </div>
              <div
                className="glass flex shrink-0 flex-col"
                style={{ height: bottomHeight }}
              >
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
                <Suspense fallback={null}>
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
                        className={cn(
                          "h-full",
                          bottomTab === "diff" ? "block" : "hidden",
                        )}
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
                </Suspense>
              </div>
            </>
          )}

          {/* Status bar — always visible */}
          <StatusBar />
        </main>

        {/* Right column: web preview */}
        {previewOpen && (
          <Suspense fallback={null}>
            <PreviewPanel />
          </Suspense>
        )}
      </div>

      {/* Global overlays */}
      <Suspense fallback={null}>
        {commandPaletteOpen && <CommandPalette onOpenSettings={openSettings} />}
        {settingsOpen && <SettingsModal onClose={closeSettings} />}
        {projectPickerOpen && <ProjectPicker onClose={closeProjectPicker} />}
        {showOnboarding && <OnboardingWizard />}
      </Suspense>
    </motion.div>
  );
}
