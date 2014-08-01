if (Meteor.isClient) {
	var native = 'he';
	Session.set('lang', 'en');

	Router.configure({
		layoutTemplate: 'layout'
	});

	function hourFromTime(date) {
		return date.getHours();
		return date.getMinutes() < 30
			? date.getHours()
			: date.getHours() + 1;
	}

	/*
	function dayChart() {
		var data = [], labels = [], max = 0;
		var oneDay = 86400000;
		var oneHour = 3600000;
		var now = new Date().getTime();
		var first = new Date().getHours()+1;

		var label;
		for (var i=0; i<24; i++) {
			var count = redalert.messages.find({
					type: 'alert',
					createdAt: {
						$lt: now - (24-i)*oneHour
						$gt:
					}
				}).count();
			data.push(count);
			if (count > max)
				max = count;
			label = first + i;
			if (label > 24)
				label -= 24;
			if (label < 12)
				label += 'am';
			else if (label == 12)
				label = '12pm';
			else if (label == 24)
				label = '12am';
			else
				label = (label-12) + 'pm';
		}

		return { data: data, labels: labels, max: max, length: 24 };
	}
	*/

	function fillGaps(data, labels, last, current, rollover) {
		var gap = current - last;
//		console.log(last, current, gap);
		if (gap < 0) {
			for (var i=1; i < -gap && last+i < rollover+1; i++) {
//				console.log('- inserting ' + (last + i));
				labels.push(last + i);
				data.push(0);
			}
			last = 0;
			gap = current - last;
//			console.log(last, current, gap);
		}
		for (var i=1; i < gap; i++) {
			labels.push(last + i);
			data.push(0);
//			console.log('+ inserting ' + (last + i));
		}
		return last;
	}

	function monthChart() {
		var data = [], labels = [], count = 0, max = 0, day = null;

		var now = new Date();
		var daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
		var daysLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
		var lastDay = new Date().getDate() + 1;
		if (lastDay > daysLastMonth) lastDay -= daysLastMonth;

		var query = {
			type: 'alert',
			createdAt: {
				$gt: new Date(now.getFullYear(), now.getMonth()-1, lastDay)	// 1 month 
			}
		};
		if (!areaQuery(query))
			return null;

		redalert.messages.find(query, {
			sort : { createdAt: 1 }
		}).forEach(function(alert) {
			day = alert.createdAt.getDate();
			if (day !== lastDay) {
				labels.push(lastDay);
				data.push(count);
				if (count > max)
					max = count;
				count = 0;

				fillGaps(data, labels, lastDay, day, daysLastMonth);
				lastDay = day;
			}
			count++;
		});
		if (count) {
			labels.push(day);
			data.push(count);
		}

		var length = data.length;
		for (var i=length; i < daysInMonth; i++) {
			data.push(0);
			labels.push(lastDay + i - length + 1);
		}

		return { data: data, labels: labels, max: max, length: data.length };
	}

	function dayChart() {
		var data = [], labels = [], count = 0, max = 0, hour = null;
		var lastHour = new Date().getHours() + 1;

		var now = new Date();
		var query = {
			type: 'alert',
			createdAt: {
				$gt: new Date(now - 86400000 + 3600000)	// 1 day 
			}
		};
		if (!areaQuery(query))
			return null;

		redalert.messages.find(query, {
			sort : { createdAt: 1 }
		}).forEach(function(alert) {
			hour = hourFromTime(alert.createdAt);
			if (hour !== lastHour) {
				labels.push(lastHour);
				data.push(count);
				if (count > max)
					max = count;
				count = 0;

				fillGaps(data, labels, lastHour, hour, 24);
				lastHour = hour;
			}
			count++;
		});
		if (count) {
			labels.push(hour);
			data.push(count);
		}

		var length = data.length;
		for (var i=length; i < 24; i++) {
			data.push(0);
			labels.push(lastHour + i - length + 1);
		}

		for (var i=0; i < 24; i++) {
			var label = labels[i];
			if (label < 12)
				labels[i] = label + 'am';
			else if (label == 12)
				labels[i] = '12pm';
			else if (label == 24)
				labels[i] = '12am';
			else
				labels[i] = (label-12) + 'pm';
		}

		return { data: data, labels: labels, max: max, length: 24 };
	};

	var currentChart = null;
	Session.setDefault('chartCoverage', 'day');
	var chartToggle = true;
	function unchart() {
		if (currentChart && currentChart.stop)
			currentChart.stop();		
	}
	function chart() {
		Deps.autorun(function() {
			unchart();
			$('#chart').html('');

			var chart = Session.get('chartCoverage') == 'day'
				? dayChart() : monthChart();
			console.log(chart);
//			var dataset = [ 5, 10, 13, 19, 21, 25, 22, 18, 15, 13,
//	                11, 12, 15, 20, 18, 17, 16, 18, 23, 25 ];

			if (!chart) return null;
		  if (!chart.max) chart.max = 1;
	    var w = $(window).innerWidth(), h = 80;
	    var barPadding = 1, scaleY = (h-35)/chart.max;

			var svg = d3.select('#chart').append('svg')
				.attr("width", w).attr("height", h);

			svg.selectAll("rect")
			  .data(chart.data)
			  .enter()
			  .append("rect")
				.attr("x", function(d, i) {
				  return i * (w / chart.length);
				})
				.attr("y", function(d) {
				    return h - (d * scaleY) - 15;
				})
				.attr("width", w / chart.length - barPadding)
				.attr("height", function(d) {
				    return d * scaleY;
				})
				.attr("fill", function(d) {
				    return "rgb(" + Math.round(d/chart.max*255) + ", 0, 0)";
				});

			var texts = svg.selectAll("text")
			  .data(chart.data)
			  .enter();

			texts.append("text")
			  .text(function(d) {
	        return d || '';
	   		})
				.attr("x", function(d, i) {
	        return i * (w / chart.length) + (w / chart.length - barPadding) / 2;
	    	})
	 		  .attr("y", function(d) {
	        return h - (d * scaleY) - 20;
	  	  })
				.attr("text-anchor", "middle")
				.attr("font-family", "sans-serif")
	   		.attr("font-size", "11px");
	   		//.attr("fill", "white");

			texts.append("text")
			  .text(function(d, i) {
			  	// return chart.labels[i];
	        return i % 2 == 1 ? chart.labels[i] : '';
	   		})
				.attr("x", function(d, i) {
	        return i * (w / chart.length) + (w / chart.length - barPadding) / 2;
	    	})
	 		  .attr("y", function(d) {
	        return h - 2;
	  	  })
				.attr("text-anchor", "middle")
				.attr("font-family", "sans-serif")
	   		.attr("font-size", "10px");
	   		//.attr("fill", "white");
   	});
	}

	Router.map(function() {
		this.route('home', {
			path: '/',
			template: 'all',
			onAfterAction: chart,
			onStop: unchart
		});

		this.route('all', {
			path: '/all',
			template: 'all',
			onAfterAction: chart,
			onStop: unchart
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

	Template.chart.events({
		'click': function(event, tpl) {
			Session.set('chartCoverage',
				Session.get('chartCoverage') == 'day'
					? 'month' : 'day');
		}
	});
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
