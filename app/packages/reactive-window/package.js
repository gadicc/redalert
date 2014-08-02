Package.describe({
  summary: "Reactive functions for window properties; width, scroll, etc"
});

Package.on_use(function (api) {  
  api.use(['reactive-dict', 'jquery'], 'client');
  api.add_files('reactive-window.js', 'client');
  api.export('rwindow', 'client');  
});
