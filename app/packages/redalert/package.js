Package.describe({
  summary: "Meteor reactive wrapper for redalert server"
});

Package.on_use(function (api) {
	api.use(['reactive-dict', 'jquery', 'ui', 'livedata', 'deps'], 'client');
  api.add_files('redalert.js', 'client');
  api.export('redalert', 'client');
});
