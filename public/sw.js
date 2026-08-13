/* Dream Comfort — admin push service worker.
   Shows a notification when a new order push arrives, even if the site/tab is closed. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "নতুন অর্ডার", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "🛒 নতুন অর্ডার";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon.png",
    badge: "/icon.png",
    tag: data.tag || "dc-order",
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: data.url || "/admin/orders" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url =
    (event.notification.data && event.notification.data.url) || "/admin/orders";
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          try {
            await client.navigate(url);
          } catch (e) {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});
