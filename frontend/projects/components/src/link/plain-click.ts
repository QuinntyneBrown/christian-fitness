/**
 * A click the app may take over: the main button with no modifier key. A middle click or a click
 * with Ctrl, Cmd, Shift or Alt opens a new tab or window, so the browser keeps it, and links in
 * the navigation components stay real links (ADR 0017).
 */
export function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
