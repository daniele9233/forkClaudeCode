import { useMemo, useRef, useEffect } from "react";
import { X, GitBranch } from "lucide-react";
import { DiffEditor, Editor } from "@monaco-editor/react";
import type { Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditorNS } from "monaco-editor";
import { cn } from "@/lib/utils";
import { useFileStore } from "@/stores/file.store";
import { useFileRead, useFileStatus } from "@/opencode/file";
import type { FileContent } from "@opencode-ai/sdk/client";

/* ──────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────── */

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mts: "typescript",
  mjs: "javascript",
  rs: "rust",
  py: "python",
  go: "go",
  rb: "ruby",
  c: "c",
  cpp: "cpp",
  h: "cpp",
  json: "json",
  jsonc: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  htm: "html",
  xml: "xml",
  svg: "xml",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  sh: "shell",
  bash: "shell",
};

function getLang(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return LANG_MAP[ext] ?? "plaintext";
}

/**
 * Reconstruct the original (pre-edit) content by applying the patch in reverse.
 * Given modified = current file content and the patch hunks, we derive what
 * the file looked like before.
 */
function reverseApplyPatch(
  modified: string,
  patch: NonNullable<FileContent["patch"]>,
): string {
  const modLines = modified.split("\n");
  const origLines: string[] = [];
  let modIdx = 0;

  for (const hunk of patch.hunks) {
    const newStart0 = hunk.newStart - 1; // patch is 1-based → 0-based

    // unchanged lines before this hunk
    while (modIdx < newStart0) {
      origLines.push(modLines[modIdx++]);
    }

    for (const line of hunk.lines) {
      // Skip "no newline" markers
      if (line.startsWith("\\ ")) continue;
      const prefix = line[0];
      const content = line.slice(1);
      if (prefix === "-") {
        origLines.push(content); // line was removed → in original
      } else if (prefix === "+") {
        modIdx++; // line was added → only in modified, skip
      } else {
        origLines.push(content); // context line → in both
        modIdx++;
      }
    }
  }

  // unchanged lines after last hunk
  while (modIdx < modLines.length) {
    origLines.push(modLines[modIdx++]);
  }

  return origLines.join("\n");
}

const STATUS_LABEL: Record<string, string> = {
  added: "A",
  modified: "M",
  deleted: "D",
};
const STATUS_COLOR: Record<string, string> = {
  added: "text-green-400 bg-green-400/10",
  modified: "text-amber-400 bg-amber-400/10",
  deleted: "text-red-400 bg-red-400/10",
};

const MONACO_OPTIONS = {
  readOnly: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  fontSize: 12,
  lineNumbers: "on" as const,
  renderLineHighlight: "all" as const,
  folding: false,
  glyphMargin: false,
  overviewRulerLanes: 0,
};

/* ──────────────────────────────────────────────────
   Line reveal helpers
   ────────────────────────────────────────────────── */

function revealLine(
  editor: MonacoEditorNS.ICodeEditor,
  monaco: Monaco,
  line: number,
  decoRef: React.MutableRefObject<string[]>,
) {
  editor.revealLineInCenter(line);
  editor.setPosition({ lineNumber: line, column: 1 });
  // Highlight the target line with a subtle amber background
  decoRef.current = editor.deltaDecorations(decoRef.current, [
    {
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "monaco-target-line",
      },
    },
  ]);
}

/* ──────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────── */

export function FileDiffPanel() {
  const { selectedFilePath, selectedLine, setSelectedFilePath } = useFileStore();
  const enabled = !!selectedFilePath;
  const {
    data: fileContent,
    isLoading,
    isError,
  } = useFileRead(selectedFilePath ?? "", enabled);
  const { data: statusList } = useFileStatus();

  // Refs to the mounted Monaco editor instances
  const editorRef = useRef<MonacoEditorNS.ICodeEditor | null>(null);
  const diffEditorRef = useRef<MonacoEditorNS.IDiffEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoRef = useRef<string[]>([]);

  // Scroll to selectedLine whenever it or the editor changes
  useEffect(() => {
    if (!selectedLine || !monacoRef.current) return;
    if (editorRef.current) {
      revealLine(editorRef.current, monacoRef.current, selectedLine, decoRef);
    } else if (diffEditorRef.current) {
      const mod = diffEditorRef.current.getModifiedEditor();
      revealLine(mod, monacoRef.current, selectedLine, decoRef);
    }
  }, [selectedLine]);

  const gitStatus = useMemo(
    () => statusList?.find((f) => f.path === selectedFilePath),
    [statusList, selectedFilePath],
  );

  const lang = selectedFilePath ? getLang(selectedFilePath) : "plaintext";
  const hasDiff = !!fileContent?.patch;

  // Fallback to first hunk line if no selectedLine was provided
  const targetLine = selectedLine ?? fileContent?.patch?.hunks?.[0]?.newStart ?? null;

  const { original, modified } = useMemo(() => {
    if (!fileContent) return { original: "", modified: "" };
    const mod = fileContent.content ?? "";
    if (!fileContent.patch) return { original: mod, modified: mod };
    return {
      original: reverseApplyPatch(mod, fileContent.patch),
      modified: mod,
    };
  }, [fileContent]);

  const handleEditorMount = (editor: MonacoEditorNS.ICodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    diffEditorRef.current = null;
    monacoRef.current = monaco;
    decoRef.current = [];
    if (targetLine) revealLine(editor, monaco, targetLine, decoRef);
  };

  const handleDiffMount = (editor: MonacoEditorNS.IDiffEditor, monaco: Monaco) => {
    diffEditorRef.current = editor;
    editorRef.current = null;
    monacoRef.current = monaco;
    decoRef.current = [];
    if (targetLine) {
      const mod = editor.getModifiedEditor();
      revealLine(mod, monaco, targetLine, decoRef);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[var(--background)]">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />

        <span className="min-w-0 flex-1 truncate font-mono text-xs text-[var(--foreground)]">
          {selectedFilePath ?? ""}
          {targetLine && (
            <span className="text-[var(--muted-foreground)]">:{targetLine}</span>
          )}
        </span>

        {gitStatus && (
          <span
            className={cn(
              "shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold",
              STATUS_COLOR[gitStatus.status] ?? "",
            )}
          >
            {STATUS_LABEL[gitStatus.status] ?? gitStatus.status}
            {gitStatus.added > 0 && (
              <span className="ml-1 text-green-400">+{gitStatus.added}</span>
            )}
            {gitStatus.removed > 0 && (
              <span className="ml-1 text-red-400">−{gitStatus.removed}</span>
            )}
          </span>
        )}

        <button
          onClick={() => setSelectedFilePath(null)}
          className="shrink-0 rounded p-0.5 text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
          title="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* ── Body ── */}
      <div className="min-h-0 flex-1">
        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-[var(--muted-foreground)]">Loading…</span>
          </div>
        )}

        {isError && (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-red-400">Failed to load file.</span>
          </div>
        )}

        {!isLoading && !isError && fileContent && hasDiff && (
          <DiffEditor
            original={original}
            modified={modified}
            language={lang}
            theme="vs-dark"
            onMount={handleDiffMount}
            options={{
              ...MONACO_OPTIONS,
              renderSideBySide: true,
              enableSplitViewResizing: true,
            }}
          />
        )}

        {!isLoading && !isError && fileContent && !hasDiff && (
          <Editor
            value={modified}
            language={lang}
            theme="vs-dark"
            onMount={handleEditorMount}
            options={MONACO_OPTIONS}
          />
        )}

        {!isLoading && !isError && !fileContent && !enabled && (
          <div className="flex h-full items-center justify-center">
            <span className="text-xs text-[var(--muted-foreground)]">
              Select a file from the tree to view it here.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
