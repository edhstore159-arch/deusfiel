import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { useAuth } from "@/kenia/contexts/AuthContext";
import { buildDebugInstructionMessage, dispatchLovableDebugError } from "./debugInstruction";

/**
 * ErrorDebugPopup
 *
 * Popup flutuante de admin que coleta uma instrução e dispara um erro global
 * intencional via CustomEvent("lovable-debug-error"). NÃO envia pela sidebar
 * de chat — o objetivo é acionar o overlay nativo da Lovable ("Try to Fix").
 */
export const ErrorDebugPopup = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [value, setValue] = useState("");
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const dragRef = useRef<{ dx: number; dy: number } | null>(null);

  const role = (user?.user_metadata as { role?: string } | undefined)?.role;
  const isAdmin =
    role === "admin" || user?.email === "admin@kenia-garcia.com.br";

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: e.clientX - dragRef.current.dx, y: e.clientY - dragRef.current.dy });
    };
    const onUp = () => (dragRef.current = null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  if (!isAdmin) return null;

  const fire = () => {
    const text = value.trim();
    if (!text) return;
    const message = buildDebugInstructionMessage(text);
    dispatchLovableDebugError(message);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      fire();
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          zIndex: 2147483646,
          background: "#111",
          color: "#fff",
          border: "1px solid #333",
          borderRadius: 9999,
          padding: "8px 14px",
          fontSize: 12,
          fontFamily: "ui-sans-serif, system-ui",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          cursor: "pointer",
        }}
      >
        🐞 Debug
      </button>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 380,
        zIndex: 2147483646,
        background: "#0b0b0b",
        color: "#fff",
        border: "1px solid #2a2a2a",
        borderRadius: 10,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        fontFamily: "ui-sans-serif, system-ui",
        fontSize: 13,
      }}
    >
      <div
        onMouseDown={(e) => {
          dragRef.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
        }}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 10px",
          borderBottom: "1px solid #222",
          cursor: "move",
          userSelect: "none",
        }}
      >
        <strong style={{ fontSize: 12 }}>🐞 Debug Tool (admin)</strong>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setMinimized((m) => !m)} style={btnGhost}>
            {minimized ? "▢" : "—"}
          </button>
          <button onClick={() => setOpen(false)} style={btnGhost}>
            ✕
          </button>
        </div>
      </div>

      {!minimized && (
        <div style={{ padding: 10 }}>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            placeholder="Descreva a tarefa/correção. Ctrl/Cmd+Enter dispara."
            rows={6}
            style={{
              width: "100%",
              resize: "vertical",
              background: "#111",
              color: "#fff",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              padding: 8,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              outline: "none",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              Dispara erro global → overlay "Try to Fix".
            </span>
            <button
              onClick={fire}
              disabled={!value.trim()}
              style={{
                background: value.trim() ? "#e11d48" : "#3a1320",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "6px 12px",
                fontSize: 12,
                cursor: value.trim() ? "pointer" : "not-allowed",
              }}
            >
              Gerar Erro
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  color: "#bbb",
  border: "1px solid #2a2a2a",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: 11,
  cursor: "pointer",
};

export default ErrorDebugPopup;
