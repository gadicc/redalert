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

	Router.onAfterAction(markActive);
	Template.layout.rendered = markActive;

	/*
	Template.famousHeader.rendered = function() {
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
				limit: 80,
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
		},
		rawTime: function(time) {
			return time && time.getTime();
		}
	});

	Meteor.setInterval(function() {
		$('.timeAgo').each(function() {
			var $this = $(this);
			$this.html(moment(parseInt($this.attr('data-time'))).fromNow());
		});
	}, 3000);
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
