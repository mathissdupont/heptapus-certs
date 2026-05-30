"use client";

import { useEffect } from "react";

export default function useUnsavedChanges(enabled: boolean, message = "Kaydedilmemiş değişiklikler var.") {
  useEffect(() => {
    if (!enabled) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = message;
      return message;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, message]);
}
