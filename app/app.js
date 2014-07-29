if (Meteor.isClient) {
	var native = 'he';
	Session.set('lang', 'en');

	Router.configure({
		layoutTemplate: 'layout'
	});

	Router.map(function() {
		this.route('home', {
			path: '/',
			template: 'all'
		});
		this.route('all', {
			path: '/all',
			template: 'all'
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

	function areaQuery(query) {
		if (Router.current().path == '/') {
			query.areas = redalert.reactive.get('area');
			if (query.areas)
				query.areas = query.areas.id;
			else
				return null;
		}
		return true;
	}

	UI.registerHelper('alerts', function() {
		var query = { type: 'alert' };
		if (!areaQuery(query))
			return [];

		if (redalert.reactive.get('ready'))
			return redalert.messages.find(query, {
				sort: { createdAt: -1 },
				limit: 80,
			});
		else
			return [];
	});

	UI.registerHelper('lastTime', function() {
		var query = {};
		if (!areaQuery(query))
			return null;
		
		var options = {
			sort: { createdAt: -1 },
			limit: 1
		};
		console.log(query, options);
		var mostRecent = redalert.messages.findOne(query, options);
		return mostRecent ? mostRecent.createdAt.getTime() : null;
	});

	UI.registerHelper('langObj', function(obj) {
		return obj[Session.get('lang')] || obj.native;
	});

	Template.alert.helpers({
		area: function() {
			var id = this.valueOf();
			return RedAlert.areas.byId(id);
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

	Meteor.setInterval(function() {
		$('.duration').each(function() {
			var $this = $(this);
			var since = $this.attr('data-since');
			if (since)
			$this.html(moment
				.duration(new Date() - parseInt(since))
				.format("d [day], h [hr], m [min], s [sec]"));
		});
	}, 1000);
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
