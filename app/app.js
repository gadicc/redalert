if (Meteor.isClient) {
	var native = 'he';
	Session.set('lang', 'en');

	Router.configure({
		layoutTemplate: 'layout'
	});

	function chart() {
		$('#chart').html('');

		var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
                11, 12, 15, 20, 18, 17, 16, 18, 23, 25 ];
    var barPadding = 1;

    var w = $(window).innerWidth(), h = 100, barPadding = 1, scaleY = 2;

		var svg = d3.select('#chart').append('svg')
			.attr("width", w).attr("height", h);

		svg.selectAll("rect")
		  .data(dataset)
		  .enter()
		  .append("rect")
			.attr("x", function(d, i) {
			  return i * (w / dataset.length);
			})
			.attr("y", function(d) {
			    return h - (d * scaleY) - 15;
			})
			.attr("width", w / dataset.length - barPadding)
			.attr("height", function(d) {
			    return d * scaleY;
			})
			.attr("fill", function(d) {
			    return "rgb(" + (d * 10) + ", 0, 0)";
			});

		var texts = svg.selectAll("text")
		  .data(dataset)
		  .enter();

		texts.append("text")
		  .text(function(d) {
        return d;
   		})
			.attr("x", function(d, i) {
        return i * (w / dataset.length) + (w / dataset.length - barPadding) / 2;
    	})
 		  .attr("y", function(d) {
        return h - (d * scaleY) - 20;
  	  })
			.attr("text-anchor", "middle")
			.attr("font-family", "sans-serif")
   		.attr("font-size", "11px");
   		//.attr("fill", "white");

		texts.append("text")
		  .text(function(d) {
        return 'd';
   		})
			.attr("x", function(d, i) {
        return i * (w / dataset.length) + (w / dataset.length - barPadding) / 2;
    	})
 		  .attr("y", function(d) {
        return h - 2;
  	  })
			.attr("text-anchor", "middle")
			.attr("font-family", "sans-serif")
   		.attr("font-size", "11px");
   		//.attr("fill", "white");

	}

	Router.map(function() {
		this.route('home', {
			path: '/',
			template: 'all',
			onAfterAction: chart
		});

		this.route('all', {
			path: '/all',
			template: 'all',
			onAfterAction: chart
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
