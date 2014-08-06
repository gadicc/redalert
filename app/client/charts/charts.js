function hourFromTime(date) {
	return date.getHours();
	return date.getMinutes() < 30
		? date.getHours()
		: date.getHours() + 1;
}

function fillGaps(data, labels, last, current, rollover) {
	// Rollover in the middle
	if (current == last-1)
		return;
	console.log(last, current);
	if (current-last < 0) {
		for (last++; last <= rollover; last++) {
//				console.log('- inserting ' + (last + i));
			labels.push(last);
			console.log(1);
			data.push(0);
		}
		last = 0;
//			console.log(last, current, gap);
	}
	if (data.length)
		last++;
	for (; last < current; last++) {
		labels.push(last);
		console.log(2);
		data.push(0);
//			console.log('+ inserting ' + (last + i));
	}
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
		time: {
			$gt: new Date(now.getFullYear(), now.getMonth()-1, lastDay)	// 1 month 
		}
	};
	if (!areaQuery(query))
		return null;

	_.each(redalert.find(query).fetch(), function(alert) {
		day = new Date(alert.time).getDate();
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
		if (count > max)
			max = count;
	}

	fillGaps(data, labels, day, day+daysInMonth-data.length+1, daysInMonth);
	return { data: data, labels: labels, max: max, length: data.length };
}

function dayChart() {
	var lastHour = new Date().getHours() + 1;
	var data = [], labels = [], count = 0, max = 0, hour = lastHour;

	var now = new Date();
	var query = {
		type: 'alert',
		time: {
			$gt: new Date(now - 86400000 + 3600000).getTime()	// 1 day 
		}
	};
	if (!areaQuery(query))
		return null;

	var results = redalert.find(query).fetch();
	_.each(results, function(alert) {
		hour = hourFromTime(new Date(alert.time));
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
		if (count > max)
			max = count;
		labels.push(hour);
		data.push(count);
	}

	fillGaps(data, labels, hour, hour+24-data.length+1, 24);

	for (var i=0; i < 24; i++) {
		var label = labels[i];
		if (label == 0)
			labels[i] = '12am';
		else if (label < 12)
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
Template.chart.rendered = function() {
	this.autorun(function() {
		$('#chart').html('');

		var chart = Session.get('chartCoverage') == 'day'
			? dayChart() : monthChart();

		if (!chart) return null;
	  if (!chart.max) chart.max = 1;
    var w = rwindow.get('$width'), h = 80;
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
		  .text(function(d, i) {
		  	//if (w > 500 || chart.length < 30)
		  		return d || '';
		  	//else {
	      //  return i % 2 == 1 ? d || '' : '';
		  	//}
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
		  	if (w > 500)
		  		return chart.labels[i];
		  	else
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
