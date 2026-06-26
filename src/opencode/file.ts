import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { FileNode, FileContent } from "@opencode-ai/sdk/client";
import { getClient } from "./client";

export type { FileNode, FileContent };

export const fileKeys = {
  all: ["files"] as const,
  list: (path: string) => [...fileKeys.all, "list", path] as const,
  read: (path: string) => [...fileKeys.all, "read", path] as const,
  status: () => [...fileKeys.all, "status"] as const,
  project: () => ["project", "current"] as const,
};

/** Get the current project metadata (worktree path, vcs). */
export function useProjectCurrent() {
  return useQuery({
    queryKey: fileKeys.project(),
    queryFn: async () => {
      const res = await getClient().project.current({ throwOnError: true });
      return res.data;
    },
  });
}

/** List files and directories at a given path (one level, non-recursive). */
export function useFileList(path: string, enabled = true) {
  return useQuery({
    queryKey: fileKeys.list(path),
    queryFn: async () => {
      const res = await getClient().file.list({
        query: { path },
        throwOnError: true,
      });
      return res.data ?? [];
    },
    enabled,
    staleTime: 5_000,
  });
}

/** Read the content of a file. */
export function useFileRead(path: string, enabled = true) {
  return useQuery({
    queryKey: fileKeys.read(path),
    queryFn: async () => {
      const res = await getClient().file.read({
        query: { path },
        throwOnError: true,
      });
      return res.data;
    },
    enabled,
    staleTime: 10_000,
  });
}

/** Git status of modified/added/deleted files in the project. */
export function useFileStatus() {
  return useQuery({
    queryKey: fileKeys.status(),
    queryFn: async () => {
      const res = await getClient().file.status({ throwOnError: true });
      return res.data ?? [];
    },
    staleTime: 3_000,
  });
}

/** Invalidate file list and status caches — call after agent edits files. */
export function useInvalidateFiles() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: fileKeys.all });
  };
}
