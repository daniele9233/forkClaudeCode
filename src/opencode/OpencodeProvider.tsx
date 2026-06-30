import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { initClient } from "./client";
import { startEventStream, stopEventStream } from "./events";
import { checkEngineVersion, MIN_ENGINE_MAJOR, PINNED_SDK_VERSION } from "./version";
import { useSessionStore } from "@/stores/session.store";
import { useUIStore } from "@/stores/ui.store";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2_000,
      retry: 1,
    },
  },
});

const OpencodeContext = createContext<{ queryClient: QueryClient }>({ queryClient });
export const useOpencodeContext = () => useContext(OpencodeContext);

interface Props {
  children: ReactNode;
}

export function OpencodeProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <SidecarBootstrap>{children}</SidecarBootstrap>
    </QueryClientProvider>
  );
}

function SidecarBootstrap({ children }: { children: ReactNode }) {
  const { setOpencodeUrl, setSidecarStatus } = useSessionStore();
  const started = useRef(false);

  const ready = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Initialize once, whether triggered by the event or the startup poll.
    const onReady = (url: string) => {
      if (ready.current) return;
      ready.current = true;
      initClient(url);
      setOpencodeUrl(url);
      setSidecarStatus("ready");
      startEventStream();

      // Warn if the running engine doesn't match the SDK we built against.
      checkEngineVersion().then((info) => {
        const { setEngineWarning } = useUIStore.getState();
        setEngineWarning(
          info.ok
            ? null
            : `Engine ${info.engine} looks older than this build expects (opencode ${MIN_ENGINE_MAJOR}.x, SDK ${PINNED_SDK_VERSION}). Some features could misbehave — consider updating opencode.`,
        );
      });
    };

    // Listen for the "opencode-ready" event emitted by the Tauri backend.
    const unlistenReady = listen<string>("opencode-ready", (event) => {
      onReady(event.payload);
    });

    const unlistenError = listen<string>("opencode-error", (event) => {
      setSidecarStatus("error", event.payload);
    });

    // The event above is fire-and-forget: if the sidecar became ready *before*
    // this listener was registered (e.g. attaching to an already-running
    // `opencode serve` via OPENCODE_BASE_URL, which is near-instant), the event
    // is lost and we'd hang on "connecting" forever. So also poll the backend
    // for the URL on mount, with a few retries to cover the auto-spawn window.
    let cancelled = false;
    (async () => {
      for (let i = 0; i < 20 && !cancelled && !ready.current; i++) {
        try {
          const url = await invoke<string>("get_opencode_url");
          if (url) {
            onReady(url);
            return;
          }
        } catch {
          // Sidecar not up yet — wait and retry; the event will also fire.
        }
        await new Promise((r) => setTimeout(r, 500));
      }
    })();

    return () => {
      cancelled = true;
      stopEventStream();
      unlistenReady.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [setOpencodeUrl, setSidecarStatus]);

  return <>{children}</>;
}
