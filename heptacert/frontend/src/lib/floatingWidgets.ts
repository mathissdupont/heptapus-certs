export const FLOATING_WIDGET_OPEN_EVENT = "heptacert:floating-widget-open";

export type FloatingWidget = "assistant" | "tour";

export function announceFloatingWidgetOpen(widget: FloatingWidget) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<FloatingWidget>(FLOATING_WIDGET_OPEN_EVENT, { detail: widget }));
}

export function onFloatingWidgetOpen(listener: (widget: FloatingWidget) => void) {
  if (typeof window === "undefined") return () => undefined;
  const handler = (event: Event) => listener((event as CustomEvent<FloatingWidget>).detail);
  window.addEventListener(FLOATING_WIDGET_OPEN_EVENT, handler);
  return () => window.removeEventListener(FLOATING_WIDGET_OPEN_EVENT, handler);
}
