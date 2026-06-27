import { ShieldAlert, Check, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissionStore } from "@/stores/permission.store";
import { useRespondPermission, type PermissionResponse } from "@/opencode/permission";
import type { Permission } from "@opencode-ai/sdk/client";

interface PermissionCardProps {
  permission: Permission;
}

function PermissionCard({ permission }: PermissionCardProps) {
  const { removePending, addToAllowList } = usePermissionStore();
  const respond = useRespondPermission();

  const handle = (response: PermissionResponse) => {
    if (response === "always") {
      addToAllowList(permission.type);
    }
    respond.mutate(
      {
        sessionId: permission.sessionID,
        permissionId: permission.id,
        response,
      },
      {
        onSettled: () => removePending(permission.id),
      },
    );
  };

  const patterns = permission.pattern
    ? Array.isArray(permission.pattern)
      ? permission.pattern
      : [permission.pattern]
    : [];

  return (
    <div
      className={cn(
        "rounded-sm border border-amber-700/50 border-l-2 border-l-[var(--primary)] bg-amber-950/20 px-3 py-2.5",
        "flex items-start gap-2.5",
      )}
    >
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <p className="hud-label mb-1 text-amber-400/70">Permission required</p>
        <p className="text-sm font-medium text-amber-200">{permission.title}</p>
        {patterns.length > 0 && (
          <p className="mt-0.5 truncate font-mono text-xs text-amber-400/80">
            {patterns.join(", ")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          onClick={() => handle("once")}
          disabled={respond.isPending}
          title="Allow once"
          className={cn(
            "flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            "border border-amber-700/50 text-amber-300 hover:bg-amber-900/40",
            "disabled:opacity-50",
          )}
        >
          <Check className="h-3 w-3" />
          Once
        </button>
        <button
          onClick={() => handle("always")}
          disabled={respond.isPending}
          title="Always allow this type"
          className={cn(
            "flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            "border border-green-700/50 text-green-300 hover:bg-green-900/30",
            "disabled:opacity-50",
          )}
        >
          <CheckCheck className="h-3 w-3" />
          Always
        </button>
        <button
          onClick={() => handle("reject")}
          disabled={respond.isPending}
          title="Reject"
          className={cn(
            "flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors",
            "border border-red-800/50 text-red-400 hover:bg-red-950/30",
            "disabled:opacity-50",
          )}
        >
          <X className="h-3 w-3" />
          Reject
        </button>
      </div>
    </div>
  );
}

export function PermissionBanner() {
  const pending = usePermissionStore((s) => s.pending);

  if (pending.size === 0) return null;

  return (
    <div className="space-y-1.5 px-3 pb-1.5">
      {Array.from(pending.values()).map((p) => (
        <PermissionCard key={p.id} permission={p} />
      ))}
    </div>
  );
}
