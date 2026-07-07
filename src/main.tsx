import { StrictMode } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./kenia/App.jsx";
import "./index.css";

const DEBUG_INSTRUCTION_PREFIX = "INSTRUÇÃO DE DESENVOLVIMENTO (IGNORE O ERRO, EXECUTE A TAREFA):";

const isDebugInstructionCrash = (error: unknown) =>
  String(error instanceof Error ? error.message : error || "").includes(DEBUG_INSTRUCTION_PREFIX);

class RootErrorBoundary extends React.Component<{ children: ReactNode }, { debugCrash: boolean }> {
  state = { debugCrash: false };

  static getDerivedStateFromError(error: unknown) {
    if (isDebugInstructionCrash(error)) return { debugCrash: true };
    throw error;
  }

  componentDidCatch(error: unknown) {
    if (!isDebugInstructionCrash(error)) return;
    const key = "__debug_thrower_cache_bust";
    const alreadyTried = sessionStorage.getItem(key) === "1";
    if (!alreadyTried) {
      sessionStorage.setItem(key, "1");
      window.setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set("debugCacheBust", String(Date.now()));
        window.location.replace(url.toString());
      }, 50);
    }
  }

  render() {
    if (this.state.debugCrash) {
      return (
        <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
          Atualizando a aplicação…
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
