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
  Sparkles,
  ArrowUpRight,
  Palette,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel } from "@/components/Panel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useAgents, useMcpStatus, useConfig, useUpdateConfig } from "@/opencode/config";
import type { McpLocalConfig, McpRemoteConfig } from "@/opencode/config";
import { SKILLS } from "@/skills/catalog";
import { activeCatalog } from "@/skills/match";
import { RECIPES } from "@/skills/recipes";
import { open } from "@tauri-apps/plugin-dialog";
import { importSkillFromUrl } from "@/skills/importSkill";
import { captureStyleFromUrl, captureStyleFromImage } from "@/opencode/style";
import { useModelVision } from "@/opencode/modelCaps";
import { useSkillsStore } from "@/stores/skills.store";
import { useStylesStore } from "@/stores/styles.store";
import { useComposerStore } from "@/stores/composer.store";
import { useMemoryStore } from "@/stores/memory.store";
import { Image as ImageIcon, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { RulesTab } from "./RulesTab";

type Tab = "studio" | "styles" | "skills" | "agents" | "mcp" | "rules";

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

/** Curated "connect in one click" MCP servers (local stdio, via npx). */
const RECOMMENDED_MCP: {
  name: string;
  label: string;
  desc: string;
  command: string[];
}[] = [
  {
    name: "kubernetes",
    label: "Kubernetes / RKE2",
    desc: "Legge il cluster (anche RKE2/Rancher, via kubeconfig), genera/valida manifest & Helm, kubectl/helm guidati.",
    command: ["npx", "-y", "mcp-server-kubernetes"],
  },
  {
    name: "playwright",
    label: "Playwright (Browser)",
    desc: "Scraping siti di lavoro + test end-to-end dei tuoi front-end (apre, clicca, verifica).",
    command: ["npx", "-y", "@playwright/mcp@latest"],
  },
];

function McpTab({ query }: { query: string }) {
  const { data: config } = useConfig();
  const { data: mcpStatus = {} } = useMcpStatus();
  const updateConfig = useUpdateConfig();

  const [addMode, setAddMode] = useState<AddMode>(null);
  const [newName, setNewName] = useState("");
  const [newCommand, setNewCommand] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  /** One-click connect a recommended server (adds a local MCP entry). */
  const addRecommended = async (r: (typeof RECOMMENDED_MCP)[number]) => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = {
        ...config?.mcp,
        [r.name]: { type: "local" as const, command: r.command, enabled: true },
      };
      await updateConfig.mutateAsync({ mcp: updated });
    } finally {
      setSaving(false);
    }
  };

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

  const missingRecommended = RECOMMENDED_MCP.filter((r) => !config?.mcp?.[r.name]);

  return (
    <div className="space-y-2">
      {/* One-click connect: curated MCP servers not yet configured */}
      {missingRecommended.length > 0 && (
        <div className="rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/5 p-3">
          <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Consigliati — collega in un click
          </div>
          <div className="flex flex-col gap-1.5">
            {missingRecommended.map((r) => (
              <button
                key={r.name}
                onClick={() => void addRecommended(r)}
                disabled={saving}
                className="flex items-start gap-2 rounded-md border border-[var(--border)] bg-[var(--muted)]/20 p-2 text-left transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/40 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-[var(--primary)]" />
                ) : (
                  <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
                )}
                <span className="min-w-0">
                  <span className="text-xs font-medium text-[var(--foreground)]">
                    {r.label}
                  </span>
                  <span className="block text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                    {r.desc}
                  </span>
                  <code className="mt-0.5 block truncate font-mono text-[9px] text-[var(--muted-foreground)]/70">
                    {r.command.join(" ")}
                  </code>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[9px] leading-relaxed text-[var(--muted-foreground)]/70">
            Richiedono Node/npx (e per Kubernetes un `kubeconfig` valido; per Playwright i
            browser installati). Si avviano quando l'agente li usa.
          </p>
        </div>
      )}

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

/* ── Styles tab (saved reusable design languages) ─────────────── */

function StylesTab({ query }: { query: string }) {
  const styles = useStylesStore((s) => s.styles);
  const activeId = useStylesStore((s) => s.activeId);
  const setActive = useStylesStore((s) => s.setActive);
  const renameStyle = useStylesStore((s) => s.renameStyle);
  const removeStyle = useStylesStore((s) => s.removeStyle);
  const addStyle = useStylesStore((s) => s.addStyle);
  const { known: modelKnown, vision } = useModelVision();
  const [openId, setOpenId] = useState<string | null>(null);

  // Import a style from an external site (URL) or a screenshot image.
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState<null | "url" | "image">(null);
  const [importError, setImportError] = useState<string | null>(null);

  const saveAndActivate = (name: string, spec: string) => {
    setActive(addStyle(name, spec));
  };

  const importFromUrl = async () => {
    const url = importUrl.trim();
    if (!url || importing) return;
    setImporting("url");
    setImportError(null);
    try {
      const spec = await captureStyleFromUrl(url);
      let host = url;
      try {
        host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname;
      } catch {
        /* keep raw */
      }
      saveAndActivate(`${host} — stile`, spec);
      setImportUrl("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(null);
    }
  };

  const importFromImage = async () => {
    if (importing) return;
    const picked = await open({
      multiple: false,
      filters: [{ name: "Immagini", extensions: ["png", "jpg", "jpeg", "webp"] }],
    });
    const path = typeof picked === "string" ? picked : null;
    if (!path) return;
    setImporting("image");
    setImportError(null);
    try {
      const spec = await captureStyleFromImage(path);
      const name = (path.split(/[\\/]/).pop() ?? "immagine").replace(/\.[^.]+$/, "");
      saveAndActivate(`${name} — stile`, spec);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(null);
    }
  };

  const q = query.trim().toLowerCase();
  const filtered = q ? styles.filter((s) => s.name.toLowerCase().includes(q)) : styles;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-2.5 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        Gli <b className="text-[var(--foreground)]">stili salvati</b> sono il linguaggio
        visivo (DESIGN.md) di un sito. Salvane uno dal pulsante{" "}
        <b className="text-[var(--foreground)]">🎨 Stile</b> nell'anteprima (il tuo sito),
        oppure importane uno qui sotto da un <b>URL</b> o da uno <b>screenshot</b> di un
        sito che ti piace.{" "}
        <i>(URL/immagine rendono al meglio con un modello con visione.)</i>
      </div>

      {/* Import from external URL / image */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          Importa uno stile
        </div>
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded border border-[var(--border)] bg-transparent px-2">
            <LinkIcon className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />
            <input
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void importFromUrl()}
              placeholder="https://sito-che-mi-piace.com"
              className="h-7 min-w-0 flex-1 bg-transparent font-mono text-[10px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <button
            onClick={() => void importFromUrl()}
            disabled={!importUrl.trim() || !!importing}
            className="flex h-7 shrink-0 items-center gap-1 rounded bg-[var(--primary)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40"
          >
            {importing === "url" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            URL
          </button>
          <button
            onClick={() => void importFromImage()}
            disabled={!!importing}
            title="Importa da uno screenshot"
            className="flex h-7 shrink-0 items-center gap-1 rounded border border-[var(--border)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-40"
          >
            {importing === "image" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImageIcon className="h-3 w-3" />
            )}
            Immagine
          </button>
        </div>
        {importError && <p className="mt-1.5 text-[10px] text-red-400">{importError}</p>}
        {modelKnown && (
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-[10px]",
              vision ? "text-[var(--color-online)]" : "text-amber-400",
            )}
          >
            {vision ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            {vision
              ? "Il modello selezionato vede le immagini: URL/screenshot funzionano al meglio."
              : "Il modello selezionato non vede le immagini: userò l'HTML (meno preciso). Per il top scegli un modello con 👁."}
          </p>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">
          {q
            ? `Nessuno stile per “${query}”`
            : "Ancora nessuno stile salvato. Apri l'anteprima di un sito e premi 🎨 Stile."}
        </p>
      )}

      {filtered.map((s) => {
        const isActive = activeId === s.id;
        const isOpen = openId === s.id;
        return (
          <div
            key={s.id}
            className={cn(
              "rounded-lg border p-3 transition-colors",
              isActive
                ? "border-[var(--primary)]/50 bg-[var(--primary)]/5"
                : "border-[var(--border)] bg-[var(--muted)]/20",
            )}
          >
            <div className="flex items-center gap-2">
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ background: s.accent }}
                aria-hidden
              />
              <input
                value={s.name}
                onChange={(e) => renameStyle(s.id, e.target.value)}
                className="min-w-0 flex-1 bg-transparent text-xs font-medium text-[var(--foreground)] outline-none focus:underline"
                title="Rinomina lo stile"
              />
              <button
                onClick={() => setActive(isActive ? null : s.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                  isActive
                    ? "bg-[var(--primary)]/20 text-[var(--primary)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
                )}
                title={isActive ? "In uso — clicca per disattivare" : "Usa questo stile"}
              >
                {isActive ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Palette className="h-3 w-3" />
                )}
                {isActive ? "In uso" : "Usa"}
              </button>
              <button
                onClick={() => removeStyle(s.id)}
                title="Elimina stile"
                className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-950/40 hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
              DESIGN.md ({s.spec.length} caratteri)
            </button>
            {isOpen && (
              <pre className="mt-1.5 max-h-56 overflow-y-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--color-forge-950)] p-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                {s.spec}
              </pre>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Studio tab (one-click website design recipes) ────────────── */

function StudioTab({ query, onClose }: { query: string; onClose: () => void }) {
  const fill = useComposerStore((s) => s.fill);
  const webDesigner = useSkillsStore((s) => s.webDesigner);
  const setWebDesigner = useSkillsStore((s) => s.setWebDesigner);
  const q = query.trim().toLowerCase();
  const recipes = q
    ? RECIPES.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.style.toLowerCase().includes(q) ||
          r.layout.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q),
      )
    : RECIPES;

  // Universal quality stack forced into EVERY recipe on top of its own skills:
  // distinctive taste, real typography/color and correct motion craft — the
  // baseline for awwwards-caliber output.
  const RECIPE_BASE = ["impeccable", "type-color", "emil-motion"];
  const launch = (recipe: (typeof RECIPES)[number]) => {
    const ids = Array.from(new Set([...recipe.skillIds, ...RECIPE_BASE]));
    fill(recipe.prompt, "recipe", ids);
    onClose();
  };

  return (
    <div className="space-y-2.5">
      {/* What this is */}
      <div className="rounded-lg border border-[var(--primary)]/25 bg-[var(--primary)]/5 p-3">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--foreground)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
          Studio · {RECIPES.length} ricette pronte
        </div>
        <p className="mt-1 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
          Ogni ricetta è un briefing pronto (già scritto correttamente per usare le
          skill). Clicca: il prompt entra nella chat, premi invio e l'agente costruisce il
          sito. <b>Enterprise</b> = siti completi full-stack, di livello vendibile;{" "}
          <b>Stili</b> = starter di linguaggio visivo.
        </p>
      </div>

      {/* Always-on Web Designer mode */}
      <button
        onClick={() => setWebDesigner(!webDesigner)}
        className="flex w-full items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-left"
      >
        {webDesigner ? (
          <ToggleRight className="h-4 w-4 shrink-0 text-[var(--primary)]" />
        ) : (
          <ToggleLeft className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-[var(--foreground)]">
            Modalità Web Designer {webDesigner ? "· attiva" : "· off"}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)]">
            Applica una mentalità da team di 30 esperti front-end a <b>ogni</b> richiesta
            web, non solo alle ricette.
          </div>
        </div>
      </button>

      {recipes.length === 0 && (
        <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">
          Nessuna ricetta per “{query}”
        </p>
      )}

      {/* Enterprise verticals first (the sellable, full sites), then style starters */}
      {(
        [
          ["enterprise", "Enterprise · siti completi vendibili"],
          ["style", "Stili · starter di linguaggio visivo"],
        ] as const
      ).map(([cat, label]) => {
        const group = recipes.filter((r) => (r.category ?? "style") === cat);
        if (group.length === 0) return null;
        return (
          <div key={cat}>
            <div className="mb-1.5 mt-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              {label}
              <span className="rounded bg-[var(--muted)] px-1 tabular-nums">
                {group.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {group.map((r) => (
                <button
                  key={r.id}
                  onClick={() => launch(r)}
                  title={`Inserisci il brief “${r.name}” nella chat`}
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3 text-left transition-all hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/40"
                >
                  {/* Accent wash */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
                    style={{ background: r.accent }}
                  />
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-lg leading-none">{r.emoji}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="text-xs font-semibold text-[var(--foreground)]">
                    {r.name}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                    {r.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span
                      className="rounded-sm px-1.5 py-0.5 text-[9px] font-medium"
                      style={{ background: `${r.accent}22`, color: r.accent }}
                    >
                      {r.style}
                    </span>
                    <span className="rounded-sm bg-[var(--muted)] px-1.5 py-0.5 text-[9px] text-[var(--muted-foreground)]">
                      {r.layout}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Skills tab (kikkoCode skill playbooks) ───────────────────── */

function SkillManagerTab({ query }: { query: string }) {
  const {
    enabled,
    autoApply,
    setEnabled,
    setAutoApply,
    custom,
    addCustom,
    removeCustom,
  } = useSkillsStore();
  const [openId, setOpenId] = useState<string | null>(null);

  // Import a community skill from a GitHub raw / https markdown URL.
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const handleImport = async () => {
    if (!importUrl.trim() || importing) return;
    setImporting(true);
    setImportError(null);
    try {
      const skill = await importSkillFromUrl(importUrl);
      addCustom(skill);
      setImportUrl("");
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  };

  const all = activeCatalog();
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.keywords.some((k) => k.toLowerCase().includes(q)),
      )
    : all;
  void custom; // subscribed so imports re-render the list

  return (
    <div className="space-y-2">
      {/* What skills are */}
      <p className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/10 p-2.5 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
        Le <b className="text-[var(--foreground)]">skill</b> sono playbook di un esperto.
        Quando la tua richiesta contiene le loro parole-chiave, la skill viene iniettata
        in automatico nel prompt e l'agente la segue. Per iniziare subito usa la scheda{" "}
        <b className="text-[var(--foreground)]">Studio</b>.
      </p>

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

      {/* Import from URL (GitHub raw / blob links are normalized) */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 p-3">
        <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
          Import skill from URL
        </div>
        <div className="flex items-center gap-2">
          <input
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleImport()}
            placeholder="https://github.com/user/repo/blob/main/SKILL.md"
            className="h-7 min-w-0 flex-1 rounded border border-[var(--border)] bg-transparent px-2 font-mono text-[10px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)]"
          />
          <button
            onClick={() => void handleImport()}
            disabled={!importUrl.trim() || importing}
            className="flex h-7 shrink-0 items-center gap-1 rounded bg-[var(--primary)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-foreground)] hover:opacity-90 disabled:opacity-40"
          >
            {importing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            Import
          </button>
        </div>
        {importError && <p className="mt-1.5 text-[10px] text-red-400">{importError}</p>}
      </div>

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
              {s.id.startsWith("custom-") && (
                <button
                  onClick={() => removeCustom(s.id)}
                  title="Remove imported skill"
                  className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] hover:bg-red-950/40 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
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
              Triggers &amp; playbook
              {s.source && <span className="opacity-50">· {s.source}</span>}
            </button>
            {isOpen && (
              <div className="mt-1.5 space-y-2">
                <div>
                  <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Trigger words ({s.keywords.length})
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-sm bg-[var(--primary)]/10 px-1.5 py-0.5 font-mono text-[9px] text-[var(--primary)]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-1 text-[9px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
                    Playbook
                  </div>
                  <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--color-forge-950)] p-2 text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                    {s.body}
                  </pre>
                </div>
              </div>
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
  const [tab, setTab] = useState<Tab>("studio");
  const [query, setQuery] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  // Counts for the tab badges (queries are deduped by React Query).
  const { data: agents = [] } = useAgents();
  const { data: config } = useConfig();
  const { data: mcpStatus = {} } = useMcpStatus();
  const enabledSkills = useSkillsStore((s) => s.enabled);
  const customSkills = useSkillsStore((s) => s.custom);
  const mcpNames = Object.keys(config?.mcp ?? {});
  const mcpConnected = mcpNames.filter((n) => mcpStatus[n]?.connected).length;
  const autoMemorize = useMemoryStore((s) => s.autoMemorize);

  const savedStyles = useStylesStore((s) => s.styles);
  const activeStyleId = useStylesStore((s) => s.activeId);

  const TABS: { id: Tab; label: string; count: string }[] = [
    { id: "studio", label: "Studio", count: String(RECIPES.length) },
    {
      id: "styles",
      label: "Stili",
      count: activeStyleId ? `${savedStyles.length}·on` : String(savedStyles.length),
    },
    {
      id: "skills",
      label: "Skills",
      count: `${enabledSkills.length}/${SKILLS.length + customSkills.length}`,
    },
    { id: "agents", label: "Agents", count: String(agents.length) },
    {
      id: "mcp",
      label: "MCP",
      count: mcpNames.length > 0 ? `${mcpConnected}/${mcpNames.length}` : "0",
    },
    { id: "rules", label: "Rules", count: autoMemorize ? "🧠" : "off" },
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
                tab === "studio"
                  ? "Cerca ricette di design…"
                  : tab === "styles"
                    ? "Cerca stili salvati…"
                    : tab === "skills"
                      ? "Search skills…"
                      : tab === "agents"
                        ? "Search agents, tools…"
                        : tab === "rules"
                          ? "(search not used here)"
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
            {tab === "studio" && <StudioTab query={query} onClose={onClose} />}
            {tab === "styles" && <StylesTab query={query} />}
            {tab === "skills" && <SkillManagerTab query={query} />}
            {tab === "agents" && <SkillsTab query={query} />}
            {tab === "mcp" && <McpTab query={query} />}
            {tab === "rules" && <RulesTab />}
          </ErrorBoundary>
        </div>
      </Panel>
    </div>
  );
}
