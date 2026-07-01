import { useState, useRef, useEffect } from "react";
import {
  X,
  Bot,
  Network,
  Plus,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Trash2,
  Search as SearchIcon,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAgents, useMcpStatus, useConfig, useUpdateConfig } from "@/opencode/config";
import type { McpLocalConfig, McpRemoteConfig } from "@/opencode/config";
import { SKILLS } from "@/skills/catalog";
import { useSkillsStore } from "@/stores/skills.store";

type Tab = "skills" | "agents" | "mcp";

/* ── Skills tab ──────────────────────────────────────────────── */

function SkillsTab({ query }: { query: string }) {
  const { data: agents = [], isLoading } = useAgents();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          (a.description ?? "").toLowerCase().includes(q) ||
          (a.mode ?? "").toLowerCase().includes(q) ||
          Object.keys(a.tools ?? {}).some((t) => t.toLowerCase().includes(q)),
      )
    : agents;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">
        {q ? `No agents match “${query}”` : "No agents/skills configured"}
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {filtered.map((agent) => (
        <div
          key={agent.name}
          className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {agent.name}
                  </span>
                  {agent.builtIn && (
                    <span className="rounded bg-[var(--muted)] px-1 text-[9px] text-[var(--muted-foreground)]">
                      built-in
                    </span>
                  )}
                  <span
                    className={cn(
                      "rounded px-1 text-[9px]",
                      agent.mode === "subagent"
                        ? "bg-amber-500/15 text-amber-400"
                        : agent.mode === "primary"
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-[var(--muted)] text-[var(--muted-foreground)]",
                    )}
                  >
                    {agent.mode}
                  </span>
                </div>
                {agent.description && (
                  <p className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                    {agent.description}
                  </p>
                )}
              </div>
            </div>
            {agent.model && (
              <span className="shrink-0 text-[10px] text-[var(--muted-foreground)]">
                {agent.model.providerID}/{agent.model.modelID}
              </span>
            )}
          </div>

          {/* Tools enabled for this agent (guard: engine may omit `tools`) */}
          {Object.keys(agent.tools ?? {}).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(agent.tools ?? {})
                .filter(([, enabled]) => enabled)
                .map(([tool]) => (
                  <span
                    key={tool}
                    className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[9px] text-[var(--muted-foreground)]"
                  >
                    {tool}
                  </span>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── MCP tab ──────────────────────────────────────────────────── */

type AddMode = null | "local" | "remote";

function McpTab({ query }: { query: string }) {
  const { data: config } = useConfig();
  const { data: mcpStatus = {} } = useMcpStatus();
  const updateConfig = useUpdateConfig();

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [newName, setNewName] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const q = query.trim().toLowerCase();
  const mcpEntries = Object.entries(config?.mcp ?? {}).filter(([name, entry]) => {
    if (!q) return true;
    const url = entry.type === "local" ? entry.command.join(" ") : entry.url;
    return (
      name.toLowerCase().includes(q) ||
      entry.type.includes(q) ||
      (url ?? "").toLowerCase().includes(q)
    );
  });

  const handleToggle = (name: string, entry: McpLocalConfig | McpRemoteConfig) => {
    const updated = { ...config?.mcp, [name]: { ...entry, enabled: !entry.enabled } };
    updateConfig.mutate({ mcp: updated });
  };

  const handleRemove = (name: string) => {
    const updated = { ...config?.mcp };
    delete updated[name];
    updateConfig.mutate({ mcp: updated });
  };

  const handleAdd = async () => {
    const trimName = newName.trim();
    if (!trimName) return;
    setSaving(true);
    try {
      let entry: McpLocalConfig | McpRemoteConfig;
      if (addMode === "local") {
        const parts = newCommand.trim().split(/\s+/);
        if (!parts[0]) return;
        entry = { type: "local", command: parts, enabled: true };
      } else {
        const url = newUrl.trim();
        if (!url) return;
        entry = { type: "remote", url, enabled: true };
      }
      const updated = { ...config?.mcp, [trimName]: entry };
      await updateConfig.mutateAsync({ mcp: updated });
      setNewName("");
      setNewCommand("");
      setNewUrl("");
      setAddMode(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      {mcpEntries.length === 0 && (
        <p className="py-4 text-center text-xs text-[var(--muted-foreground)]">
          No MCP servers configured
        </p>
      )}

      {mcpEntries.map(([name, entry]) => {
        const status = mcpStatus[name];
        const isEnabled = entry.enabled !== false;
        return (
          <div
            key={name}
            className={cn(
              "rounded-lg border p-3 transition-opacity",
              isEnabled
                ? "border-[var(--border)] bg-[var(--muted)]/20"
                : "border-[var(--border)]/50 bg-transparent opacity-60",
            )}
          >
            <div className="flex items-start gap-2">
              <Network className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {name}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1 text-[9px]",
                      entry.type === "local"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-purple-500/15 text-purple-400",
                    )}
                  >
                    {entry.type}
                  </span>
                  {status !== undefined && (
                    <span
                      className={cn(
                        "rounded px-1 text-[9px]",
                        status.connected
                          ? "bg-green-500/15 text-green-400"
                          : "bg-red-500/15 text-red-400",
                      )}
                    >
                      {status.connected ? "connected" : "disconnected"}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-[var(--muted-foreground)]">
                  {entry.type === "local" ? entry.command.join(" ") : entry.url}
                </p>
                {status?.tools && status.tools.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {status.tools.slice(0, 8).map((t) => (
                      <span
                        key={t}
                        className="rounded bg-[var(--muted)] px-1.5 py-0.5 text-[9px] text-[var(--muted-foreground)]"
                      >
                        {t}
                      </span>
                    ))}
                    {status.tools.length > 8 && (
                      <span className="text-[9px] text-[var(--muted-foreground)]">
                        +{status.tools.length - 8} more
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleToggle(name, entry)}
                  title={isEnabled ? "Disable" : "Enable"}
                  className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {isEnabled ? (
                    <ToggleRight className="h-4 w-4 text-[var(--primary)]" />
                  ) : (
                    <ToggleLeft className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() => handleRemove(name)}
                  title="Remove"
                  className="text-[var(--muted-foreground)] hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add form */}
      {addMode === null ? (
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={() => setAddMode("local")}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <Plus className="h-3 w-3" /> Local server
          </button>
          <button
            onClick={() => setAddMode("remote")}
            className="flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-[10px] text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <Plus className="h-3 w-3" /> Remote URL
          </button>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--primary)]/30 bg-[var(--muted)]/20 p-3 space-y-2">
          <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
            Add {addMode} MCP server
          </p>
          <input
            type="text"
            placeholder="Server name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          {addMode === "local" ? (
            <input
              type="text"
              placeholder="Command (e.g. npx -y @modelcontextprotocol/server-git)"
              value={newCommand}
              onChange={(e) => setNewCommand(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          ) : (
            <input
              type="text"
              placeholder="URL (e.g. https://mcp.example.com/sse)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              className="h-7 w-full rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
            />
          )}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleAdd}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1 rounded-md bg-[var(--primary)] px-3 py-1 text-[10px] font-medium text-[var(--background)] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Save
            </button>
            <button
              onClick={() => {
                setAddMode(null);
                setNewName("");
                setNewCommand("");
                setNewUrl("");
              }}
              className="rounded-md px-3 py-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Skills tab (kikkoCode skill playbooks) ───────────────────── */

function SkillManagerTab({ query }: { query: string }) {
  const { enabled, autoApply, setEnabled, setAutoApply } = useSkillsStore();
  const [openId, setOpenId] = useState<string | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? SKILLS.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    : SKILLS;

  return (
    <div className="space-y-2">
      {/* Auto-apply master toggle */}
      <button
        onClick={() => setAutoApply(!autoApply)}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-left"
      >
        {autoApply ? (
          <ToggleRight className="h-4 w-4 shrink-0 text-[var(--primary)]" />
        ) : (
          <ToggleLeft className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-[var(--foreground)]">
            Auto-apply skills
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            Describe your goal — the matching skill is injected automatically.
          </div>
        </div>
      </button>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">
          No skills match “{query}”
        </p>
      )}

      {filtered.map((s) => {
        const on = enabled.includes(s.id);
        const isOpen = openId === s.id;
        return (
          <div
            key={s.id}
            className={cn(
              "rounded-lg border p-3 transition-opacity",
              on
                ? "border-[var(--border)] bg-[var(--muted)]/20"
                : "border-[var(--border)]/50 opacity-60",
            )}
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 text-sm leading-none">{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {s.name}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                  {s.description}
                </p>
              </div>
              <button
                onClick={() => setEnabled(s.id, !on)}
                title={on ? "Disable" : "Enable"}
                className="shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {on ? (
                  <ToggleRight className="h-4 w-4 text-[var(--primary)]" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
              </button>
            </div>

            <button
              onClick={() => setOpenId(isOpen ? null : s.id)}
              className="mt-2 flex items-center gap-1 text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {isOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              Preview playbook
              {s.source && <span className="opacity-50">· {s.source}</span>}
            </button>
            {isOpen && (
              <pre className="mt-1.5 max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--color-forge-950)] p-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                {s.body}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main modal ───────────────────────────────────────────────── */

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("skills");
  const [query, setQuery] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Counts for the tab badges (queries are deduped by React Query).
  const { data: agents = [] } = useAgents();
  const { data: config } = useConfig();
  const { data: mcpStatus = {} } = useMcpStatus();
  const enabledSkills = useSkillsStore((s) => s.enabled);
  const mcpNames = Object.keys(config?.mcp ?? {});
  const mcpConnected = mcpNames.filter((n) => mcpStatus[n]?.connected).length;

  const TABS: { id: Tab; label: string; count: string }[] = [
    { id: "skills", label: "Skills", count: `${enabledSkills.length}/${SKILLS.length}` },
    { id: "agents", label: "Agents", count: String(agents.length) },
    {
      id: "mcp",
      label: "MCP",
      count: mcpNames.length > 0 ? `${mcpConnected}/${mcpNames.length}` : "0",
    },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onMouseDown={(e) => e.target === overlayRef.current && onClose()}
    >
      <Panel
        strong
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        className="flex h-[70vh] w-[520px] flex-col overflow-hidden shadow-2xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] pr-2">
          <span className="bp-tab">settings</span>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-sm p-1 text-[var(--muted-foreground)] transition-colors hover:bg-white/5 hover:text-[var(--foreground)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-0.5 border-b border-[var(--border)] px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2 text-[10px] font-medium uppercase tracking-widest transition-colors",
                tab === t.id
                  ? "border-[var(--primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {t.label}
              <span className="rounded bg-[var(--muted)] px-1 text-[9px] tabular-nums text-[var(--muted-foreground)]">
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="shrink-0 border-b border-[var(--border)] px-4 py-2">
          <div className="flex items-center gap-2 rounded border border-[var(--border)] bg-[var(--muted)]/40 px-2">
            <SearchIcon className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "skills"
                  ? "Search skills…"
                  : tab === "agents"
                    ? "Search agents, tools…"
                    : "Search MCP servers…"
              }
              className="h-7 flex-1 bg-transparent text-[11px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>

        {/* Tab content — boundary keeps a bad engine payload from blanking the app */}
        <div className="flex-1 overflow-y-auto p-4">
          <ErrorBoundary label="settings">
            {tab === "skills" && <SkillManagerTab query={query} />}
            {tab === "agents" && <SkillsTab query={query} />}
            {tab === "mcp" && <McpTab query={query} />}
          </ErrorBoundary>
        </div>
      </Panel>
    </div>
  );
}
