// Minimal service worker so the app is installable. It does not cache pages,
// so scores and leaderboards are always fresh.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
