import { Gamepad2, LayoutPanelLeft } from "lucide-react";
import { useThemeStore } from "@/stores/theme.store";

/**
 * Switch between the two selectable interfaces: the classic blueprint UI and
 * the Retro OS synthwave skin. Same app, same features — different look.
 */
export function UiToggle() {
  const ui = useThemeStore((s) => s.ui);
  const toggleUi = useThemeStore((s) => s.toggleUi);
  const isRetro = ui === "retro";

  return (
    <button
      onClick={toggleUi}
      title={isRetro ? "Switch to classic interface" : "Switch to Retro OS interface"}
      aria-label={
        isRetro ? "Switch to classic interface" : "Switch to Retro OS interface"
      }
      className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
    >
      {isRetro ? (
        <LayoutPanelLeft className="h-4 w-4" />
      ) : (
        <Gamepad2 className="h-4 w-4" />
      )}
    </button>
  );
}
