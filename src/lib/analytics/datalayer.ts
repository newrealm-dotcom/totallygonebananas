/** Browser-only GTM/GA helpers. Safe to import from client components. */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);
}

/** Custom event name + params (shows under Events in GA /admin/analytics). */
export function trackEvent(event: string, params: Record<string, unknown> = {}): void {
  pushDataLayer({ event, ...params });
}

/** Matches `/admin/analytics` button_click + customEvent:button_text reports. */
export function trackButtonClick(buttonText: string, params: Record<string, unknown> = {}): void {
  pushDataLayer({
    event: "button_click",
    button_text: buttonText,
    ...params,
  });
}

/** Matches `/admin/analytics` form_fill reports. */
export function trackFormFill(formName: string, params: Record<string, unknown> = {}): void {
  pushDataLayer({
    event: "form_fill",
    form_name: formName,
    ...params,
  });
}
