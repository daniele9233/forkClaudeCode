import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { initClient } from "./client";
import { startEventStream, stopEventStream } from "./events";
import { checkEngineVersion, MIN_ENGINE_VERSION } from "./version";
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
  const ready = useRef(false);

  useEffect(() => {
    // NOTE: no "run once" guard here on purpose. Under React.StrictMode (dev)
    // the effect runs mount → cleanup → mount; a `started` ref guard would let
    // the first mount register the listener/poll, the cleanup tear them down,
    // and the second mount register nothing — leaving the app deaf to the
    // engine. Instead we do a full setup/teardown each mount and reset `ready`.
    ready.current = false;
    let cancelled = false;

    // Initialize once per mount, whether triggered by the event or the poll.
    const onReady = (url: string) => {
      if (ready.current || cancelled) return;
      ready.current = true;
      console.info("[kikkocode] engine ready at", url);
      initClient(url);
      setOpencodeUrl(url);
      setSidecarStatus("ready");
      startEventStream();
      // Any queries that ran before the client existed are now stale/errored —
      // refetch them now that the client is initialized.
      queryClient.invalidateQueries();

      // Warn if the running engine doesn't match the SDK we built against.
      checkEngineVersion().then((info) => {
        const { setEngineWarning } = useUIStore.getState();
        setEngineWarning(
          info.ok
            ? null
            : `Engine ${info.engine} is older than this build expects (opencode ${MIN_ENGINE_VERSION}). Some features could misbehave — consider updating opencode.`,
        );
      });
    };

    // Listen for the "opencode-ready" event emitted by the Tauri backend.
    const unlistenReady = listen<string>("opencode-ready", (event) => {
      onReady(event.payload);
    });

    const unlistenError = listen<string>("opencode-error", (event) => {
      if (cancelled || ready.current) return;
      setSidecarStatus("error", event.payload);
    });

    // The event above is fire-and-forget: if the sidecar became ready *before*
    // this listener was registered (the engine auto-spawns near-instantly when
    // attaching to an already-running server), the event is lost and we'd hang
    // on "connecting". So also poll the backend for the URL, which covers both
    // the race and the normal auto-spawn window (~up to 30s of engine startup).
    (async () => {
      for (let i = 0; i < 60 && !cancelled && !ready.current; i++) {
        try {
          const url = await invoke<string>("get_opencode_url");
          if (url && !cancelled) {
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
