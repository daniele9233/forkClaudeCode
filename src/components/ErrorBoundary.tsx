import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional label so we can tell which boundary tripped. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time exceptions so a single broken subtree (e.g. an unexpected
 * shape in engine data) shows a readable panel instead of unmounting the whole
 * app to a black screen. Resettable so the user can retry without restarting.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[kikkocode] render error${this.props.label ? ` in ${this.props.label}` : ""}:`,
      error,
      info.componentStack,
    );
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-full min-h-0 flex-1 items-center justify-center p-6">
          <div className="glass-strong max-w-md border border-red-500/30 p-5">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-red-300">
              Something went wrong
            </p>
            <p className="mt-2 break-words text-xs text-[var(--muted-foreground)]">
              {this.state.error.message || String(this.state.error)}
            </p>
            <button
              onClick={this.reset}
              className="mt-4 rounded-sm bg-[var(--primary)]/15 px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/25"
            >
              Dismiss
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
