/* global chrome */

let suppressNextClick = false;

function isPlainLeftClick(e) {
  return (
    e.button === 0 &&
    !e.defaultPrevented &&
    !e.shiftKey &&
    !e.altKey
  );
}

function getLink(e) {
  return e.target?.closest?.("a[href]");
}

function ignoreHref(href) {
  if (!href) return true;
  if (href == "#") return true; // common dummy href
  const lower = href.toLowerCase();
  return (
    lower.startsWith("javascript:") ||
    lower.startsWith("mailto:") ||
    lower.startsWith("tel:") ||
    lower.endsWith("/#")  // common dummy href
  );
}

function send(type, url) {
  chrome.runtime.sendMessage({ type, url }, (res) => {
    if (!res?.ok) window.location.assign(url);
  });
}

// Ctrl/Cmd-click: intercept BEFORE Chrome opens a new tab
document.addEventListener(
  "mousedown",
  (e) => {
    if (!isPlainLeftClick(e)) return;

    const a = e.target?.closest?.("a[href]");
    if (!a) return;

    //console.log("Clicked URL:", a.href);

    const url = a.href;
    if (ignoreHref(url)) return;

    // IMPORTANT: stop the default navigation immediately (sync),
    // otherwise the current tab will navigate before our async reply arrives.
    e.preventDefault();
    e.stopImmediatePropagation();

    (async () => {
      try {
        const res = await chrome.runtime.sendMessage({
          type: e.ctrlKey || e.metaKey ? "OPEN_IN_SAME_PANE" : "OPEN_IN_OTHER_PANE",
          url
        });

        // If we couldn't route it (not split / no partner), fall back to normal nav here.
        if (!res?.ok) {
          window.location.assign(url);
        }
        else
          suppressNextClick = true; // suppress the upcoming click event, since we've already handled it.
      } catch {
        // If messaging fails (e.g. restricted page), fall back to normal nav here.
        window.location.assign(url);
      }
    })();
  },
  true
);

document.addEventListener(
  "click",
  (e) => {
    if (suppressNextClick) {
      suppressNextClick = false;
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
  },
  true // capture
);
