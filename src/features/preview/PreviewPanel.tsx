import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  RotateCw,
  ExternalLink,
  X,
  Crosshair,
  Globe,
  Play,
  Square,
  Loader2,
  AlertTriangle,
  Wand2,
  Camera,
  ScanEye,
  Accessibility,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreviewStore } from "@/stores/preview.store";
import { useDevServerStore } from "@/stores/devserver.store";
import { usePageErrorsStore, type PageError } from "@/stores/pageErrors.store";
import { useQAStore } from "@/stores/qa.store";
import { useStylesStore } from "@/stores/styles.store";
import { useWorkspaceStore, baseName } from "@/stores/workspace.store";
import { captureStyle } from "@/opencode/style";
import { runDesignAudit } from "@/opencode/audit";
import { useSessionStore } from "@/stores/session.store";
import { useSendPrompt, useCreateSession } from "@/opencode/session";
import { useSelectionStore, type SelectedElement } from "@/stores/selection.store";
import {
  startDevServer,
  stopDevServer,
  getDevCommand,
  showPreview,
} from "@/opencode/preview";
import { ElementCompose } from "./ElementCompose";

/**
 * Web preview of the running site. The iframe loads kikkoCode's built-in
 * preview server: in proxy mode it forwards to the user's dev server and
 * injects the visual-inspector script into HTML on the fly; in static mode it
 * serves the project's index.html (also injected). So element selection works
 * automatically on any framework, with zero changes to the user's project.
 *
 * The injected inspector posts forgia:hover / forgia:select messages to the
 * parent window; this panel listens and drives the selection store +
 * ElementCompose UI. (The optional forgiaInspector() Vite plugin still works
 * and simply takes precedence — the injected script no-ops if already present.)
 */
export function PreviewPanel() {
  const { previewOpen, previewUrl, frameUrl, reloadNonce, closePreview } =
    usePreviewStore();
  const [urlInput, setUrlInput] = useState(previewUrl ?? "");
  const [reloadKey, setReloadKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const devRunning = useDevServerStore((s) => s.running);
  const devStarting = useDevServerStore((s) => s.starting);
  const devCommand = useDevServerStore((s) => s.command);
  const devLogs = useDevServerStore((s) => s.logs);
  const [availCommand, setAvailCommand] = useState<string | null>(null);

  // Error radar: runtime errors reported by the previewed page.
  const pageErrors = usePageErrorsStore((s) => s.errors);
  const errorDrawerOpen = usePageErrorsStore((s) => s.drawerOpen);
  const toggleErrorDrawer = usePageErrorsStore((s) => s.toggleDrawer);
  const clearPageErrors = usePageErrorsStore((s) => s.clear);

  // QA radar: on-demand accessibility/contrast findings from the injected script.
  const qaFindings = useQAStore((s) => s.findings);
  const qaScanning = useQAStore((s) => s.scanning);
  const qaOpen = useQAStore((s) => s.open);
  const qaRan = useQAStore((s) => s.ran);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const sendPrompt = useSendPrompt();
  const createSession = useCreateSession();

  // Discover whether this project has a dev command we can run.
  useEffect(() => {
    if (!previewOpen) return;
    let cancelled = false;
    getDevCommand().then((c) => {
      if (!cancelled) setAvailCommand(c);
    });
    return () => {
      cancelled = true;
    };
  }, [previewOpen, devRunning]);

  const {
    selectionMode,
    inspectorReady,
    toggleSelectionMode,
    setSelectionMode,
    setHoveredElement,
    setSelectedElement,
    setInspectorReady,
    clearSelection,
  } = useSelectionStore();

  // Keep the address bar in sync when the store URL changes externally.
  useEffect(() => {
    setUrlInput(previewUrl ?? "");
  }, [previewUrl]);

  // Reset selection state when preview is closed or URL changes.
  useEffect(() => {
    clearSelection();
    setInspectorReady(false);
    setSelectionMode(false);
    // A new page starts with a clean error + QA radar.
    usePageErrorsStore.getState().clear();
    useQAStore.getState().clear();
  }, [previewUrl, clearSelection, setInspectorReady, setSelectionMode]);

  // Stable ref so the message listener always sees current selectionMode
  // without needing to re-register itself on every toggle.
  const selectionModeRef = useRef(selectionMode);
  useEffect(() => {
    selectionModeRef.current = selectionMode;
  }, [selectionMode]);

  // Post a message into the iframe content window.
  const sendToIframe = useCallback((msg: object) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(msg, "*");
    } catch {
      // iframe may be cross-origin or not yet loaded — ignore
    }
  }, []);

  // Listen for messages from the iframe's injected inspector script.
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;
      const { type, ...data } = e.data as { type: string } & Partial<SelectedElement>;

      switch (type) {
        case "forgia:ready":
          setInspectorReady(true);
          // Re-enable selection if it was on before the page reloaded.
          if (selectionModeRef.current) sendToIframe({ type: "forgia:enable" });
          break;
        case "forgia:pong":
          setInspectorReady(true);
          break;
        // file/line are optional: the injected inspector always sends tag +
        // selector + HTML, so selection works even without source mapping.
        case "forgia:hover":
          if (data.tagName) setHoveredElement(data as SelectedElement);
          break;
        case "forgia:select":
          if (data.tagName) setSelectedElement(data as SelectedElement);
          break;
        case "forgia:pageerror": {
          const err = (e.data as { error?: PageError }).error;
          if (err && typeof err.message === "string") {
            usePageErrorsStore.getState().addError(err);
          }
          break;
        }
        case "forgia:audit-result": {
          const list = (e.data as { findings?: unknown }).findings;
          useQAStore.getState().setFindings(Array.isArray(list) ? (list as never[]) : []);
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [sendToIframe, setInspectorReady, setHoveredElement, setSelectedElement]);

  // Sync selection mode with the iframe after every toggle.
  useEffect(() => {
    if (!inspectorReady) return;
    sendToIframe({ type: selectionMode ? "forgia:enable" : "forgia:disable" });
  }, [selectionMode, inspectorReady, sendToIframe]);

  if (!previewOpen) return null;

  const navigate = () => {
    const url = urlInput.trim();
    if (!url) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    // Route through the injecting proxy so element selection works here too.
    void showPreview(normalized);
    setReloadKey((k) => k + 1);
  };

  const reload = () => {
    clearSelection();
    setInspectorReady(false);
    clearPageErrors();
    setReloadKey((k) => k + 1);
  };

  // Hand the page's runtime errors to the agent as a fix task.
  const fixErrors = async () => {
    if (pageErrors.length === 0 || sendPrompt.isPending) return;
    const list = pageErrors
      .slice(0, 8)
      .map(
        (er, i) =>
          `${i + 1}. [${er.kind}] ${er.message}${er.source ? ` (at ${er.source})` : ""}`,
      )
      .join("\n");
    const prompt = `The web page previewed at ${previewUrl ?? "the dev server"} reports these runtime errors:

${list}

Find the root cause in this project's source code and fix them. After fixing, briefly explain what was wrong.`;
    let sessionId = activeSessionId;
    if (!sessionId) {
      const s = await createSession.mutateAsync({});
      sessionId = s.id;
      setActiveSession(sessionId);
    }
    sendPrompt.mutate({ sessionId, text: prompt });
    clearPageErrors();
  };

  const openExternal = () => {
    if (previewUrl) window.open(previewUrl, "_blank", "noopener,noreferrer");
  };

  // "The agent sees its page": headless-capture the previewed URL and attach
  // the PNG to a prompt. Design quality multiplier — needs a vision-capable
  // model to actually look at the image.
  const [capturing, setCapturing] = useState(false);
  const captureAndPrompt = async (text: string) => {
    if (!previewUrl || capturing || sendPrompt.isPending) return;
    setCapturing(true);
    try {
      const path = await invoke<string>("capture_preview", { url: previewUrl });
      const fileUrl =
        "file://" + (path.startsWith("/") ? "" : "/") + path.replace(/\\/g, "/");
      let sessionId = activeSessionId;
      if (!sessionId) {
        const s = await createSession.mutateAsync({});
        sessionId = s.id;
        setActiveSession(sessionId);
      }
      sendPrompt.mutate({
        sessionId,
        text,
        files: [
          { type: "file", mime: "image/png", filename: "preview.png", url: fileUrl },
        ],
      });
    } catch (e) {
      // Surface the failure where the user is looking (the dev-server log area
      // doubles as the preview's message strip).
      useDevServerStore
        .getState()
        .appendLog(`[screenshot] ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCapturing(false);
    }
  };

  // Quick visual self-review (camera button).
  const showPageToAgent = () =>
    captureAndPrompt(
      `Attached is a screenshot of the web page you are building, previewed at ${previewUrl}. Look at it carefully and critique it like a senior product designer: layout, spacing, alignment, typography, visual hierarchy, contrast, consistency, responsiveness red flags. Then apply the most impactful improvements directly to the code. If you cannot see the attached image, say so explicitly instead of guessing.`,
    );

  // Multi-viewport design audit (scan button): shared with the autopilot's
  // automatic post-build quality pass (see opencode/audit.ts).
  const auditResponsive = async () => {
    if (!previewUrl || capturing || sendPrompt.isPending) return;
    setCapturing(true);
    try {
      let sessionId = activeSessionId;
      if (!sessionId) {
        const s = await createSession.mutateAsync({});
        sessionId = s.id;
        setActiveSession(sessionId);
      }
      await runDesignAudit(sessionId, previewUrl);
    } catch (e) {
      useDevServerStore
        .getState()
        .appendLog(`[audit] ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCapturing(false);
    }
  };

  // Style Memory: distill this project's visual language into a reusable saved
  // style (DESIGN.md), activate it, so you can reapply the exact look later.
  const [savingStyle, setSavingStyle] = useState(false);
  const saveStyle = async () => {
    if (savingStyle) return;
    setSavingStyle(true);
    try {
      const spec = await captureStyle();
      const dir = useWorkspaceStore.getState().currentDir;
      const name = `${dir ? baseName(dir) : "Progetto"} — stile`;
      const id = useStylesStore.getState().addStyle(name, spec);
      useStylesStore.getState().setActive(id);
      useDevServerStore
        .getState()
        .appendLog(
          `[style] salvato e attivato: ${name} (gestiscilo in Impostazioni → Stili)`,
        );
    } catch (e) {
      useDevServerStore
        .getState()
        .appendLog(`[style] ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSavingStyle(false);
    }
  };

  // Automated a11y/QA scan: ask the injected script to audit the live DOM,
  // then show the findings with a one-click "fix with agent".
  const runA11yScan = () => {
    useQAStore.getState().clear();
    useQAStore.getState().setScanning(true);
    sendToIframe({ type: "forgia:audit" });
    // Fallback: if the page never answers (no inspector yet), stop spinning.
    setTimeout(() => {
      if (useQAStore.getState().scanning) useQAStore.getState().setFindings([]);
    }, 4000);
  };

  const fixA11y = async () => {
    if (qaFindings.length === 0 || sendPrompt.isPending) return;
    const list = qaFindings
      .slice(0, 30)
      .map(
        (f, i) =>
          `${i + 1}. [${f.rule}] ${f.message}${f.selector ? ` — \`${f.selector}\`` : ""}`,
      )
      .join("\n");
    const prompt = `An automated accessibility scan of ${previewUrl ?? "the page"} found these issues. Fix them in the source code (WCAG 2.2 AA), then briefly note what you changed:

${list}

Guidelines: add real alt text; label every control; ensure text contrast ≥ 4.5:1 (3:1 for large text) by tinting colors, not by adding boxes; fix heading order; make tap targets ≥ 44px; set <html lang>. Don't regress the visual design.`;
    let sessionId = activeSessionId;
    if (!sessionId) {
      const s = await createSession.mutateAsync({});
      sessionId = s.id;
      setActiveSession(sessionId);
    }
    sendPrompt.mutate({ sessionId, text: prompt });
    useQAStore.getState().clear();
  };

  // After iframe loads a new page, ping the inspector script.
  const handleIframeLoad = () => {
    setInspectorReady(false);
    // Give the injected script time to register its message listener.
    setTimeout(() => sendToIframe({ type: "forgia:ping" }), 150);
  };

  const handleToggleSelection = () => {
    if (selectionMode) {
      // Turning off — clear any pending selection.
      clearSelection();
    }
    toggleSelectionMode();
  };

  return (
    <div className="flex h-full w-1/2 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--background)]">
      {/* Toolbar */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-[var(--border)] px-2 py-1.5">
        <button
          onClick={reload}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Reload"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>

        {/* Visual selection mode toggle */}
        <button
          onClick={handleToggleSelection}
          className={cn(
            "shrink-0 rounded p-1 transition-colors",
            selectionMode
              ? "bg-[var(--primary)]/15 text-[var(--primary)] ring-1 ring-[var(--primary)]/40"
              : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
          )}
          title={
            selectionMode
              ? "Exit selection mode"
              : "Enter selection mode (hover & click elements to edit)"
          }
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>

        {/* Dev server run/stop (kikkoCode-managed) */}
        {devRunning || devStarting ? (
          <button
            onClick={() => void stopDevServer()}
            className="shrink-0 rounded p-1 text-[var(--color-online)] transition-colors hover:bg-[var(--muted)]"
            title={`Stop dev server${devCommand ? ` (${devCommand})` : ""}`}
          >
            {devStarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Square className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          availCommand && (
            <button
              onClick={() => void startDevServer()}
              className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--color-online)]"
              title={`Run dev server (${availCommand})`}
            >
              <Play className="h-3.5 w-3.5" />
            </button>
          )
        )}

        {/* Show the page to the agent: screenshot → visual self-review */}
        {previewUrl && (
          <button
            onClick={() => void showPageToAgent()}
            disabled={capturing || sendPrompt.isPending}
            className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
            title="Show this page to the agent (screenshot → visual review & improve)"
          >
            {capturing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        )}

        {/* Multi-viewport design audit: 3 breakpoints → Impeccable checklist → fixes */}
        {previewUrl && (
          <button
            onClick={() => void auditResponsive()}
            disabled={capturing || sendPrompt.isPending}
            className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] disabled:opacity-50"
            title="Design audit across mobile/tablet/desktop: the agent scores the page on an Impeccable checklist and applies the fixes"
          >
            {capturing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ScanEye className="h-3.5 w-3.5" />
            )}
            Audit
          </button>
        )}

        {/* Automated a11y / contrast scan of the live page */}
        {previewUrl && (
          <button
            onClick={runA11yScan}
            disabled={qaScanning}
            className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] disabled:opacity-50"
            title="Accessibility scan: check the live page for contrast, alt text, labels, tap targets…"
          >
            {qaScanning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Accessibility className="h-3.5 w-3.5" />
            )}
            A11y
          </button>
        )}

        {/* Save this project's visual style for reuse on future sites */}
        <button
          onClick={() => void saveStyle()}
          disabled={savingStyle}
          className="flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] transition-colors hover:bg-[var(--primary)]/15 hover:text-[var(--primary)] disabled:opacity-50"
          title="Salva stile: memorizza il linguaggio visivo di questo sito per riusarlo su altri progetti"
        >
          {savingStyle ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Palette className="h-3.5 w-3.5" />
          )}
          Stile
        </button>

        {/* QA findings badge — reopen the drawer once a scan has run */}
        {qaRan && (
          <button
            onClick={() => useQAStore.getState().toggleOpen()}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold transition-colors",
              qaFindings.length === 0
                ? "bg-[var(--color-online)]/15 text-[var(--color-online)]"
                : qaOpen
                  ? "bg-amber-500/25 text-amber-300 ring-1 ring-amber-400/50"
                  : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25",
            )}
            title={`${qaFindings.length} accessibility issue(s)`}
          >
            <Accessibility className="h-3.5 w-3.5" />
            {qaFindings.length}
          </button>
        )}

        {/* Error radar badge — the page reported runtime errors */}
        {pageErrors.length > 0 && (
          <button
            onClick={toggleErrorDrawer}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded px-1.5 py-1 text-[10px] font-bold transition-colors",
              errorDrawerOpen
                ? "bg-red-500/25 text-red-300 ring-1 ring-red-400/50"
                : "bg-red-500/15 text-red-400 hover:bg-red-500/25",
            )}
            title={`${pageErrors.length} runtime error(s) on this page — click to inspect`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {pageErrors.length}
          </button>
        )}

        <input
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") navigate();
          }}
          spellCheck={false}
          className={cn(
            "min-w-0 flex-1 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1",
            "font-mono text-xs text-[var(--foreground)] outline-none",
            "focus:border-[var(--primary)]",
          )}
          placeholder="http://localhost:5173/"
        />

        <button
          onClick={openExternal}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Open in browser"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={closePreview}
          className="shrink-0 rounded p-1 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Close preview"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Error radar drawer — the page's runtime errors + one-click fix */}
      {errorDrawerOpen && pageErrors.length > 0 && (
        <div className="shrink-0 border-b border-red-500/30 bg-red-950/20">
          <div className="max-h-40 overflow-y-auto px-3 py-2">
            {pageErrors.map((er, i) => (
              <div
                key={`${er.ts}-${i}`}
                className="flex gap-2 py-1 font-mono text-[11px]"
              >
                <span className="shrink-0 rounded bg-red-500/20 px-1 uppercase text-red-400">
                  {er.kind}
                </span>
                <span className="min-w-0 flex-1 break-words text-red-200/90">
                  {er.message}
                  {er.source && <span className="text-red-300/50"> — {er.source}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-red-500/20 px-3 py-1.5">
            <button
              onClick={() => void fixErrors()}
              disabled={sendPrompt.isPending}
              className="flex items-center gap-1.5 rounded bg-red-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {sendPrompt.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Wand2 className="h-3 w-3" />
              )}
              Fix with agent
            </button>
            <button
              onClick={clearPageErrors}
              className="rounded px-2 py-1 text-[10px] uppercase tracking-wider text-red-300/70 transition-colors hover:bg-red-500/10 hover:text-red-200"
            >
              Clear
            </button>
            <span className="ml-auto text-[10px] text-red-300/50">
              captured live from the page
            </span>
          </div>
        </div>
      )}

      {/* QA / a11y drawer — accessibility findings + one-click fix */}
      {qaOpen && qaRan && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-950/20">
          {qaFindings.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--color-online)]">
              <Accessibility className="h-3.5 w-3.5" />
              Nessun problema di accessibilità evidente. (Controllo euristico — per un
              audit completo servono anche test manuali con tastiera e screen reader.)
            </div>
          ) : (
            <>
              <div className="max-h-40 overflow-y-auto px-3 py-2">
                {qaFindings.map((f, i) => (
                  <div key={i} className="flex gap-2 py-1 font-mono text-[11px]">
                    <span className="shrink-0 rounded bg-amber-500/20 px-1 uppercase text-amber-400">
                      {f.rule}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-amber-200/90">
                      {f.message}
                      {f.selector && (
                        <span className="text-amber-300/50"> — {f.selector}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 border-t border-amber-500/20 px-3 py-1.5">
                <button
                  onClick={() => void fixA11y()}
                  disabled={sendPrompt.isPending}
                  className="flex items-center gap-1.5 rounded bg-amber-500/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {sendPrompt.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  Fix with agent
                </button>
                <button
                  onClick={() => useQAStore.getState().clear()}
                  className="rounded px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300/70 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
                >
                  Clear
                </button>
                <span className="ml-auto text-[10px] text-amber-300/50">
                  {qaFindings.length} problemi · scan euristico
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Element compose panel — visible when an element is selected */}
      <ElementCompose />

      {/* Selection mode hint — the inspector is auto-injected by the preview
          proxy, so "not ready" just means the page hasn't loaded it yet. */}
      {selectionMode && !inspectorReady && (
        <div className="shrink-0 border-b border-[var(--border)] bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-400">
          Waiting for the page inspector… If this persists, hit reload (↻) so the page
          passes through kikkoCode&apos;s preview proxy.
        </div>
      )}

      {/* Iframe (a URL is loaded) or empty-state guidance (no server yet) */}
      {previewUrl ? (
        <div
          className={cn("min-h-0 flex-1 bg-white", selectionMode && "cursor-crosshair")}
        >
          <iframe
            ref={iframeRef}
            key={`${reloadKey}-${reloadNonce}`}
            src={frameUrl ?? previewUrl}
            title="Web preview"
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            onLoad={handleIframeLoad}
          />
        </div>
      ) : devStarting || devRunning ? (
        // Dev server booting — show live output until the URL appears.
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--primary)]" />
            <span className="text-xs text-[var(--foreground)]">
              Starting dev server{devCommand ? ` · ${devCommand}` : ""}…
            </span>
          </div>
          <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-[var(--muted-foreground)]">
            {devLogs.length ? devLogs.join("\n") : "waiting for output…"}
          </pre>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <Globe className="h-10 w-10 text-[var(--muted-foreground)]/40" />
          <p className="text-sm font-medium text-[var(--foreground)]">
            No page to preview yet
          </p>
          {availCommand ? (
            <>
              <p className="max-w-xs text-xs leading-relaxed text-[var(--muted-foreground)]">
                This project has a dev server. Run it and kikkoCode will show the live
                site here — no terminal needed.
              </p>
              <button
                onClick={() => void startDevServer()}
                className="flex items-center gap-2 rounded-lg border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--primary)]/20"
              >
                <Play className="h-4 w-4" />
                Run dev server
                <code className="rounded bg-[var(--muted)] px-1 font-mono text-[11px]">
                  {availCommand}
                </code>
              </button>
            </>
          ) : (
            <p className="max-w-xs text-xs leading-relaxed text-[var(--muted-foreground)]">
              Ask the agent to build a page and kikkoCode will preview it automatically.
              Or type any URL in the bar above and press Enter.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
