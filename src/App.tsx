import { cn } from "@/lib/utils";

export default function App() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--background)]">
      <div
        className={cn(
          "rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg",
          "flex flex-col items-center gap-4 text-center",
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-6 w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.82m5.84-2.56a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.63 4.1a14.98 14.98 0 01-5.84 7.38"
            />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">
            Forgia
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            GUI desktop per OpenCode — scaffold pronto
          </p>
        </div>
        <div className="flex gap-2 text-xs text-[var(--muted-foreground)]">
          <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5">Tauri 2</span>
          <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5">React 19</span>
          <span className="rounded-full bg-[var(--secondary)] px-2 py-0.5">Tailwind v4</span>
        </div>
      </div>
    </div>
  );
}
