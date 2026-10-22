// Minimal service worker: lets the site show notifications (needed on Android Chrome).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients
      .matchAll({ type: "window" })
      .then((list) =>
        list.length ? list[0].focus() : self.clients.openWindow(url),
      ),
  );
});
