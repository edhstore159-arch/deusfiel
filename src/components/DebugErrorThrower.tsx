import { useEffect } from "react";

/**
 * DebugErrorThrower
 *
 * Listens to "lovable-debug-error" events without breaking the app.
 * Messages on this channel are debug/instruction payloads and must
 * never cause a white screen.
 */
export const DebugErrorThrower = () => {
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string" && detail.length > 0) {
        console.warn("lovable-debug-error ignored:", detail);
      }
    };
    window.addEventListener("lovable-debug-error", handler as EventListener);
    return () =>
      window.removeEventListener("lovable-debug-error", handler as EventListener);
  }, []);

  return null;
};

export default DebugErrorThrower;
