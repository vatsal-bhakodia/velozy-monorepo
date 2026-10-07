# Velozy brand assets

The `public` directory is the canonical source for shared Velozy and third-party
brand assets. Apps expose `public` at `/brand` and `public/icons` at `/icons`
through links in each app's `public` directory. This keeps one source file for
each logo while allowing every app to serve assets from its own origin.
