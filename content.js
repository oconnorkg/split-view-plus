/* global chrome */

function isPlainLeftClick(e) {
  return (
    e.button === 0 &&
    !e.defaultPrevented &&
    !e.metaKey &&
    !e.ctrlKey &&
    !e.shiftKey &&
    !e.altKey
  );
}

function ignoreHref(href) {
  if (!href) return true;
  const lower = href.toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:")
  );
}

document.addEventListener(
  "click",
  (e) => {
    if (!isPlainLeftClick(e)) return;

    const a = e.target?.closest?.("a[href]");
    if (!a) return;

    const url = a.href;
    if (ignoreHref(url)) return;

    // IMPORTANT: stop the default navigation immediately (sync),
    // otherwise the current tab will navigate before our async reply arrives.
    e.preventDefault();
    e.stopImmediatePropagation();

    (async () => {
      try {
        const res = await chrome.runtime.sendMessage({
          type: "OPEN_IN_OTHER_PANE",
          url
        });

        // If we couldn't route it (not split / no partner), fall back to normal nav here.
        if (!res?.ok) {
          window.location.assign(url);
        }
      } catch {
        // If messaging fails (e.g. restricted page), fall back to normal nav here.
        window.location.assign(url);
      }
    })();
  },
  true // capture
);
