"use client";

import { useEffect } from "react";

export default function useKeyboardShortcut(
  key: string,
  handler: () => void,
  options: { meta?: boolean; enabled?: boolean; ignoreInputs?: boolean } = {},
) {
  const { meta = false, enabled = true, ignoreInputs = true } = options;

  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isInput = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (ignoreInputs && isInput) return;
      if (meta && !(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      event.preventDefault();
      handler();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, handler, ignoreInputs, key, meta]);
}
