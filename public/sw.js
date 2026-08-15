// Service Worker for Skillful — handles notification clicks and web push events
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle web push events (from server-side VAPID push)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Skillful", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Skillful";
  const options = {
    body: data.body || "",
    icon: "/favicon.png",
    badge: "/favicon.png",
    tag: data.tag || "skillful-push",
    renotify: true,
    data: {
      actionUrl: data.actionUrl || data.url || "/",
      type: data.type || "tip",
      actionLabel: data.actionLabel || "Open",
    },
    actions: [
      {
        action: "open",
        title: data.actionLabel || "Open",
      },
      {
        action: "dismiss",
        title: "Dismiss",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks (both push and local)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notifData = event.notification.data || {};
  const actionUrl = notifData.actionUrl || "/";
  const urlToOpen = new URL(actionUrl, self.location.origin).href;

  if (event.action === "dismiss") return;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Try to focus an existing window and navigate it
        for (let i = 0; i < windowClients.length; i++) {
          const client = windowClients[i];
          if ("focus" in client) {
            return client.focus().then((focusedClient) => {
              if (focusedClient && "navigate" in focusedClient) {
                return focusedClient.navigate(urlToOpen);
              }
            });
          }
        }
        // No existing window — open a new one
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Handle notification close (analytics hook)
self.addEventListener("notificationclose", (event) => {
  // Could send analytics about dismissed notifications
});
