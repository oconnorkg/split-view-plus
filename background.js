/* global chrome */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg?.type !== "OPEN_IN_OTHER_PANE") {
      sendResponse({ ok: false, reason: "unknown_message" });
      return;
    }

    const url = msg.url;
    if (!url) {
      sendResponse({ ok: false, reason: "no_url" });
      return;
    }

    const senderTab = sender.tab;
    if (!senderTab?.id || senderTab.windowId == null) {
      sendResponse({ ok: false, reason: "no_sender_tab" });
      return;
    }

    // Refresh sender tab so splitViewId is up-to-date
    const freshSenderTab = await chrome.tabs.get(senderTab.id);
    const splitViewId = freshSenderTab.splitViewId;

    // If not in split view, don't intercept
    if (typeof splitViewId !== "number" || splitViewId < 0) {
      sendResponse({ ok: false, reason: "not_in_split_view" });
      return;
    }

    // Find the other tab in the same split view
    const tabs = await chrome.tabs.query({ windowId: freshSenderTab.windowId });
    const other = tabs.find(
      (t) => t.id && t.id !== freshSenderTab.id && t.splitViewId === splitViewId
    );

    const targetTabId = other?.id ?? null;

    // Small improvement: if partner missing (split view ended / tab closed), don't hijack
    if (!targetTabId) {
      sendResponse({ ok: false, reason: "no_split_partner" });
      return;
    }
	
	// only open link in tab on the right half of the split
	if (other.index < freshSenderTab.index) {
		sendResponse({ ok: false, reason: "not_left_split" });
		return;
	}

    try {
      // Update other pane without stealing focus
      await chrome.tabs.update(targetTabId, { url, active: false });
      sendResponse({ ok: true, targetTabId });
    } catch {
      sendResponse({ ok: false, reason: "update_failed" });
    }
  })();

  return true; // async response
});
