# About `manifest.webmanifest`

`id` is deliberately still `dubai-shopping-planner` even though the app is now
called **Shopping List**.

`id` is the PWA's identity. If it changes, browsers treat the app as a brand new
one: an already-installed copy stops receiving updates and a second icon can
appear on the home screen. The visible `name`, `short_name` and `description`
were renamed; the identity was not.

The same reasoning applies to the localStorage key, the IndexedDB database name
and the service-worker cache prefix, all of which still carry the old name.
