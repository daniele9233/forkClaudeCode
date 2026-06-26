import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { OpencodeProvider } from "./opencode/OpencodeProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <OpencodeProvider>
      <App />
    </OpencodeProvider>
  </React.StrictMode>,
);
