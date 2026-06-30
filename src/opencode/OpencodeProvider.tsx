import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { listen } from "@tauri-apps/api/event";
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

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Listen for the "opencode-ready" event emitted by the Tauri backend.
    const unlistenReady = listen<string>("opencode-ready", (event) => {
      const url = event.payload;
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
    });

    const unlistenError = listen<string>("opencode-error", (event) => {
      setSidecarStatus("error", event.payload);
    });

    return () => {
      stopEventStream();
      unlistenReady.then((fn) => fn());
      unlistenError.then((fn) => fn());
    };
  }, [setOpencodeUrl, setSidecarStatus]);

  return <>{children}</>;
}
