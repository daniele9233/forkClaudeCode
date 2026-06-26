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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgents, useMcpStatus, useConfig, useUpdateConfig } from "@/opencode/config";
import type { McpLocalConfig, McpRemoteConfig } from "@/opencode/config";

type Tab = "skills" | "mcp";

/* ── Skills tab ──────────────────────────────────────────────── */

function SkillsTab() {
  const { data: agents = [], isLoading } = useAgents();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">
        No agents/skills configured
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {agents.map((agent) => (
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

          {/* Tools enabled for this agent */}
          {Object.keys(agent.tools).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {Object.entries(agent.tools)
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

function McpTab() {
  const { data: config } = useConfig();
  const { data: mcpStatus = {} } = useMcpStatus();
  const updateConfig = useUpdateConfig();

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [newName, setNewName] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const mcpEntries = Object.entries(config?.mcp ?? {});

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

/* ── Main modal ───────────────────────────────────────────────── */

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("skills");
  const overlayRef = useRef<HTMLDivElement>(null);

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
      <div className="flex h-[70vh] w-[520px] flex-col rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <span className="text-sm font-semibold text-[var(--foreground)]">Settings</span>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex shrink-0 items-center gap-0.5 border-b border-[var(--border)] px-4">
          {(["skills", "mcp"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "border-b-2 px-3 py-2 text-xs font-medium capitalize transition-colors",
                tab === t
                  ? "border-[var(--primary)] text-[var(--foreground)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              {t === "skills" ? "Agents & Skills" : "MCP Servers"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "skills" && <SkillsTab />}
          {tab === "mcp" && <McpTab />}
        </div>
      </div>
    </div>
  );
}
