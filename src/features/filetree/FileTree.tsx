import { useState, useEffect, useMemo, useCallback } from "react";
import { useFileStore } from "@/stores/file.store";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  FileCog,
  File as FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useProjectCurrent,
  useFileList,
  useFileStatus,
  useInvalidateFiles,
} from "@/opencode/file";
import type { FileNode } from "@opencode-ai/sdk/client";
import { onEventType } from "@/opencode/events";
import type { EventFileEdited, EventFileWatcherUpdated } from "@opencode-ai/sdk/client";

type GitStatus = "added" | "deleted" | "modified";

/* ──────────────────────────────────────────────────
   File icon helper
   ────────────────────────────────────────────────── */

const EXT_MAP: Array<[string[], React.ReactNode]> = [
  [
    ["ts", "tsx", "js", "jsx", "mts", "mjs", "cjs", "vue", "svelte"],
    <FileCode className="h-3 w-3 shrink-0 text-blue-400" />,
  ],
  [
    ["rs", "go", "py", "rb", "c", "cpp", "h"],
    <FileCode className="h-3 w-3 shrink-0 text-orange-400" />,
  ],
  [["json", "jsonc"], <FileJson className="h-3 w-3 shrink-0 text-yellow-400" />],
  [["md", "mdx", "txt", "rst"], <FileText className="h-3 w-3 shrink-0 text-slate-400" />],
  [
    ["toml", "yaml", "yml", "env", "ini", "cfg", "conf", "lock"],
    <FileCog className="h-3 w-3 shrink-0 text-violet-400" />,
  ],
  [
    ["css", "scss", "sass", "less"],
    <FileCode className="h-3 w-3 shrink-0 text-pink-400" />,
  ],
  [
    ["html", "htm", "xml", "svg"],
    <FileCode className="h-3 w-3 shrink-0 text-amber-400" />,
  ],
];

function fileIcon(name: string): React.ReactNode {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  for (const [exts, icon] of EXT_MAP) {
    if (exts.includes(ext)) return icon;
  }
  return <FileIcon className="h-3 w-3 shrink-0 text-[var(--muted-foreground)]" />;
}

const STATUS_CHAR: Record<GitStatus, string> = {
  added: "A",
  modified: "M",
  deleted: "D",
};
const STATUS_COLOR: Record<GitStatus, string> = {
  added: "text-green-400",
  modified: "text-amber-400",
  deleted: "text-red-400",
};

/* ──────────────────────────────────────────────────
   Single tree row
   ────────────────────────────────────────────────── */

interface NodeProps {
  node: FileNode;
  depth: number;
  statusMap: Map<string, GitStatus>;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

function FileTreeNode({ node, depth, statusMap, selectedPath, onSelect }: NodeProps) {
  const isDir = node.type === "directory";
  const [expanded, setExpanded] = useState(false);

  const { data: children } = useFileList(node.path, isDir && expanded);

  const gitStatus = statusMap.get(node.path);
  const isSelected = selectedPath === node.path;

  const indent = depth * 12 + 6;

  const handleClick = () => {
    if (isDir) {
      setExpanded((v) => !v);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        style={{ paddingLeft: `${indent}px` }}
        className={cn(
          "flex w-full items-center gap-1 rounded py-[3px] pr-2 text-left text-xs transition-colors",
          isSelected
            ? "bg-[var(--primary)]/15 text-[var(--foreground)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--muted)]/40 hover:text-[var(--foreground)]",
          gitStatus ? STATUS_COLOR[gitStatus] : "",
        )}
        title={node.path}
      >
        {/* expand chevron (dirs only) */}
        <span className="flex h-3 w-3 shrink-0 items-center justify-center">
          {isDir ? (
            expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )
          ) : null}
        </span>

        {/* icon */}
        {isDir ? (
          expanded ? (
            <FolderOpen className="h-3 w-3 shrink-0 text-amber-400" />
          ) : (
            <Folder className="h-3 w-3 shrink-0 text-amber-400/70" />
          )
        ) : (
          fileIcon(node.name)
        )}

        {/* name */}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        {/* git badge */}
        {gitStatus && (
          <span
            className={cn(
              "ml-1 shrink-0 font-mono text-[10px] font-semibold",
              STATUS_COLOR[gitStatus],
            )}
          >
            {STATUS_CHAR[gitStatus]}
          </span>
        )}
      </button>

      {/* children */}
      {isDir && expanded && children && (
        <div>
          {children
            .filter((c) => !c.ignored)
            .sort((a, b) => {
              // directories first, then files, then alphabetically
              if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
              return a.name.localeCompare(b.name);
            })
            .map((child) => (
              <FileTreeNode
                key={child.path}
                node={child}
                depth={depth + 1}
                statusMap={statusMap}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   Root FileTree panel
   ────────────────────────────────────────────────── */

export function FileTree() {
  const { data: project } = useProjectCurrent();
  const { data: root, isLoading } = useFileList(".");
  const { data: statusList } = useFileStatus();
  const invalidateFiles = useInvalidateFiles();
  const { selectedFilePath, openFile } = useFileStore();
  const setSelectedPath = useCallback((path: string) => openFile(path), [openFile]);

  // Rebuild git-status map whenever status list changes
  const statusMap = useMemo(() => {
    const m = new Map<string, GitStatus>();
    statusList?.forEach((f) => m.set(f.path, f.status as GitStatus));
    return m;
  }, [statusList]);

  // Refresh on agent file edits
  useEffect(() => {
    const unsubs = [
      onEventType<EventFileEdited>("file.edited", () => {
        invalidateFiles();
      }),
      onEventType<EventFileWatcherUpdated>("file.watcher.updated", () => {
        invalidateFiles();
      }),
    ];
    return () => unsubs.forEach((fn) => fn());
  }, [invalidateFiles]);

  // Project name from worktree path
  const projectName = project?.worktree
    ? (project.worktree.split("/").pop() ??
      project.worktree.split("\\").pop() ??
      "Project")
    : "Files";

  const rootNodes = root
    ? root
        .filter((n) => !n.ignored)
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        })
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center border-b border-[var(--border)]">
        <span className="bp-tab max-w-full truncate" title={project?.worktree}>
          <Folder className="h-3 w-3 shrink-0" />
          {projectName}
        </span>
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto px-1 pb-3 pt-1">
        {isLoading && <p className="hud-label px-3 py-2">Loading…</p>}
        {!isLoading && rootNodes.length === 0 && (
          <p className="hud-label px-3 py-2 opacity-50">No files found</p>
        )}
        {rootNodes.map((node) => (
          <FileTreeNode
            key={node.path}
            node={node}
            depth={0}
            statusMap={statusMap}
            selectedPath={selectedFilePath}
            onSelect={setSelectedPath}
          />
        ))}
      </div>
    </div>
  );
}
