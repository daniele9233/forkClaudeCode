import { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  MessageSquare,
  Plus,
  TerminalSquare,
  Eye,
  Crosshair,
  Settings,
  Clock,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { useUIStore } from "@/stores/ui.store";
import { useSessionStore } from "@/stores/session.store";
import { usePreviewStore } from "@/stores/preview.store";
import { openBestPreview } from "@/opencode/preview";
import { useSessions, useCreateSession } from "@/opencode/session";
import { useOnboardingStore } from "@/stores/onboarding.store";
import type { Session } from "@opencode-ai/sdk/client";

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  onOpenSettings?: () => void;
}

export function CommandPalette({ onOpenSettings }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const { closeCommandPalette, openBottom, toggleTerminal, openSettings } = useUIStore();
  const { setActiveSession } = useSessionStore();
  const { detectedUrl, previewUrl } = usePreviewStore();
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const { data: sessions = [] } = useSessions();
  const createSession = useCreateSession();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const actions: PaletteItem[] = useMemo(
    () => [
      {
        id: "new-session",
        group: "Actions",
        label: "New Session",
        description: "Start a fresh agent session",
        icon: <Plus className="h-3.5 w-3.5" />,
        onSelect: async () => {
          const s = await createSession.mutateAsync({});
          setActiveSession(s.id);
          closeCommandPalette();
        },
      },
      {
        id: "toggle-terminal",
        group: "Actions",
        label: "Toggle Terminal",
        description: "Show or hide the terminal panel",
        icon: <TerminalSquare className="h-3.5 w-3.5" />,
        onSelect: () => {
          toggleTerminal();
          closeCommandPalette();
        },
      },
      {
        id: "open-inspector",
        group: "Actions",
        label: "Open Context Inspector",
        description: "View token usage and context breakdown",
        icon: <Layers className="h-3.5 w-3.5" />,
        onSelect: () => {
          openBottom("inspector");
          closeCommandPalette();
        },
      },
      {
        id: "open-timeline",
        group: "Actions",
        label: "Open Checkpoint Timeline",
        description: "Browse and rewind to previous steps",
        icon: <Clock className="h-3.5 w-3.5" />,
        onSelect: () => {
          openBottom("timeline");
          closeCommandPalette();
        },
      },
      {
        id: "open-preview",
        group: "Actions",
        label: "Open Web Preview",
        description: detectedUrl ?? previewUrl ?? "Auto-detects the running site",
        icon: <Eye className="h-3.5 w-3.5" />,
        onSelect: () => {
          void openBestPreview();
          closeCommandPalette();
        },
      },
      {
        id: "open-settings",
        group: "Actions",
        label: "Open Settings",
        description: "Agents & Skills, MCP servers",
        icon: <Settings className="h-3.5 w-3.5" />,
        onSelect: () => {
          closeCommandPalette();
          (onOpenSettings ?? openSettings)();
        },
      },
      {
        id: "replay-intro",
        group: "Actions",
        label: "Replay Intro",
        description: "Show the first-run onboarding again",
        icon: <Sparkles className="h-3.5 w-3.5" />,
        onSelect: () => {
          resetOnboarding();
          closeCommandPalette();
        },
      },
      {
        id: "select-model",
        group: "Actions",
        label: "Switch Model",
        description: "Change the active AI model",
        icon: <Crosshair className="h-3.5 w-3.5" />,
        onSelect: () => {
          // Focus the model switcher button
          (
            document.querySelector("[title='Switch model']") as HTMLButtonElement
          )?.click();
          closeCommandPalette();
        },
      },
    ],
    [
      createSession,
      setActiveSession,
      closeCommandPalette,
      toggleTerminal,
      openBottom,
      openSettings,
      onOpenSettings,
      resetOnboarding,
    ],
  );

  const sessionItems: PaletteItem[] = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => b.time.updated - a.time.updated)
        .filter((s): s is Session => !s.parentID)
        .slice(0, 12)
        .map((s) => ({
          id: `session-${s.id}`,
          group: "Sessions",
          label: s.title?.trim() || "Untitled session",
          description: undefined,
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          onSelect: () => {
            setActiveSession(s.id);
            closeCommandPalette();
          },
        })),
    [sessions, setActiveSession, closeCommandPalette],
  );

  const allItems = [...actions, ...sessionItems];

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allItems;
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q),
    );
  }, [query, allItems]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const arr = map.get(item.group) ?? [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return map;
  }, [filtered]);

  // Flatten for keyboard navigation
  const flatItems = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatItems[activeIdx]?.onSelect();
    } else if (e.key === "Escape") {
      closeCommandPalette();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeCommandPalette();
      }}
    >
      <Panel
        strong
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-[560px] overflow-hidden shadow-2xl"
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search sessions and actions…"
            className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
          />
          <kbd className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[9px] text-[var(--muted-foreground)]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {flatItems.length === 0 && (
            <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">
              No results for "{query}"
            </p>
          )}

          {Array.from(grouped.entries()).map(([group, items]) => (
            <div key={group}>
              <p className="hud-label px-3 pb-1 pt-3">{group}</p>
              {items.map((item) => {
                const globalIdx = flatItems.indexOf(item);
                const isActive = globalIdx === activeIdx;
                return (
                  <button
                    key={item.id}
                    data-idx={globalIdx}
                    onClick={item.onSelect}
                    onMouseEnter={() => setActiveIdx(globalIdx)}
                    className={cn(
                      "flex w-full items-center gap-3 border-l-2 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                        : "border-transparent text-[var(--muted-foreground)] hover:bg-white/[0.03] hover:text-[var(--foreground)]",
                    )}
                  >
                    <span
                      className={cn(
                        "shrink-0",
                        isActive
                          ? "text-[var(--primary)]"
                          : "text-[var(--muted-foreground)]",
                      )}
                    >
                      {item.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="block truncate text-xs font-medium uppercase tracking-wider">
                        {item.label}
                      </span>
                      {item.description && (
                        <span className="block truncate text-[10px] text-[var(--muted-foreground)]">
                          {item.description}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-3 border-t border-[var(--border)] px-3 py-1.5">
          <span className="text-[9px] text-[var(--muted-foreground)]">
            <kbd className="rounded bg-[var(--muted)] px-1 py-0.5">↑↓</kbd> navigate
          </span>
          <span className="text-[9px] text-[var(--muted-foreground)]">
            <kbd className="rounded bg-[var(--muted)] px-1 py-0.5">↵</kbd> select
          </span>
          <span className="text-[9px] text-[var(--muted-foreground)]">
            <kbd className="rounded bg-[var(--muted)] px-1 py-0.5">Ctrl K</kbd> toggle
          </span>
        </div>
      </Panel>
    </div>
  );
}
