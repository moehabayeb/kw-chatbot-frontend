// A simple service worker to make the site installable
self.addEventListener('fetch', function(event) {
  // We are not adding any offline logic for this app, 
  // as it requires a live connection to the backend.
  // We simply pass the request through.
  event.respondWith(fetch(event.request));
});