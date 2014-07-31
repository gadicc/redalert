Package.describe({
  summary: "Reactive functions for window properties; width, scroll, etc"
});

Package.on_use(function (api) {
  api.export('rwindow');
  api.use('reactive-dict', 'client');
  api.add_files('reactive-window.js', 'client');
});
