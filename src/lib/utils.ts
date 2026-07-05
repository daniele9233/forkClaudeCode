import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Turn a local filesystem path (Windows or POSIX) into a `file://` URL the
 *  engine can read — used to attach captured screenshots to a prompt. */
export function toFileUrl(path: string): string {
  return "file://" + (path.startsWith("/") ? "" : "/") + path.replace(/\\/g, "/");
}
