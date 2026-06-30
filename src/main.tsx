import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
// Apply the persisted theme before first paint (side-effect on import).
import "./stores/theme.store";
import App from "./App";
import { OpencodeProvider } from "./opencode/OpencodeProvider";
import { ErrorBoundary } from "./components/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary label="app">
      <OpencodeProvider>
        <App />
      </OpencodeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
