if (Meteor.isClient) {

	Router.configure({
		layoutTemplate: 'layout'
	});

	Router.map(function() {
		this.route('home', {
			path: '/'
		});
		this.route('home', {
			path: '/all'
		});
	});

	function markActive() {
		var path = Router.current().path;
		$('a.pageIcon').removeClass('active');
		$('a.pageIcon[href="' + path + '"]').addClass('active');
	}

	Router.after(markActive);
	Template.layout.rendered = markActive;

	/*
	Template.header.rendered = function() {
		Meteor.setTimeout(markActive, 200);
	};

	famousCmp.ready(function(require) {
		famousCmp.registerView('GridLayout', famous.views.GridLayout);
	});
	*/

	UI.registerHelper('alerts', function() {
		if (redalert.reactive.get('ready'))
			return redalert.messages.find({ type: 'alert'}, {
				sort: { createdAt: -1 },
				limit: 25,
			});
		else
			return [];
	});

	Template.alert.helpers({
		area: function() {
			var id = this.valueOf();
			return RedAlert.areas[id];
		},
		time: function(time) {
			return moment(time).format('DD/MM HH:mm:ss');
		},
		ago: function(time) {
			return moment(time).fromNow();
		}
	});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
