var AREAS_JSON = './areas.json';
var LOCATIONS_JSON = './locations.json';
var FORCE_REGEN = false;

var fs = require('fs');
var http = require('http');

var request = require('request');
var Fiber = require('fibers');

var areas = require(AREAS_JSON);
var locations = require(LOCATIONS_JSON);

function getLoc(name, areaId) {
	if (locations[name])
		return locations[name].id;

	var id = Object.keys(locations).length + 1;
	locations[name] = { id: id, name: name, areaId: areaId };
	return id;
}

if (FORCE_REGEN || !areas) {
	areas = {}; locations = {};
	console.log('Regenerating region mapping...');

	var loc, locs = fs.readFileSync('pikud_areas.csv').toString().split('\n');
	for (var i=1; i < locs.length; i++) {
		loc = locs[i].split(',');
		if (!areas[loc[1]])
			areas[loc[1]] = {
				id: parseInt(loc[1]),
				locations: []
			}
			areas[loc[1]].locations.push(getLoc(loc[0], loc[1]));
	}

	var history = require('./history.json');
	for (var k=0; k < history.length; k++) {
		for (var i=0; i < history[k].data.length; i++) {
			var multi = history[k].data[i].split(', ');
			for (var j=0; j < multi.length; j++) {
				var match = multi[j].match(/^(.+) ([0-9]+)$/);
				if (match) {
					if (!areas[match[2]])
						areas[match[2]] = { id: parseInt(match[2]) };
					areas[match[2]].region = match[1];
					areas[match[2]].name = match[0];
				}
			}
		}
	}

	var name_locs = locations;
	locations = {};
	for (name in name_locs)
		locations[name_locs[name].id] = name_locs[name];
}

function sleep(ms) {
  var fiber = Fiber.current;
  setTimeout(function() {
      fiber.run();
  }, ms);
  Fiber.yield();
}

function get_geodata(name) {
	var fiber = Fiber.current;

	request({
		uri: 'http://maps.googleapis.com/maps/api/geocode/json?address='
			+ name + ', ישראל',
		method: 'GET',
		json: true
	 }, function(err, res, body) {
	 		fiber.run(body.results);
	});
	return Fiber.yield();
}

Fiber(function() {
	var loc, i=0, added=0, length = Object.keys(locations).length;
	if (1)
	for (key in locations) {
		i++;
		if (!locations[key].geodata || !locations[key].geodata.length) {
			added++;
	 		console.log(i + '/' + length + ': ' + locations[key].name + ' ('
	 			+ Math.round(i / length * 100) + '%)');
			locations[key].geodata = get_geodata(locations[key].name);
			console.log(locations[key].geodata);
	 		sleep(50);
	 		if (added % 10 == 0) {
	 			console.log('sync');
				fs.writeFileSync(LOCATIONS_JSON, JSON.stringify(locations));
	 		}
	 	}
	}

	if (1)
	for (key in areas) {
		areas[key].geometry = {
			bounds: { northeast: {}, southwest: {} },
			location: {}
		}
		if (areas[key].locations)
		for (var i=0; i < areas[key].locations.length; i++) {
			var loc = locations[areas[key].locations[i]].geodata[0];

			console.log(locations[areas[key].locations[i]].geodata);

			if (!loc)
				continue;

			// TODO, check if location is inside of bounds, otherwise extend
			if (!loc.geometry.bounds)
				continue;

			if (!areas[key].geometry.bounds.northeast.lat) {
				areas[key].geometry.bounds.northeast.lat
					= loc.geometry.bounds.northeast.lat;
				areas[key].geometry.bounds.northeast.lng
					= loc.geometry.bounds.northeast.lng;
				areas[key].geometry.bounds.southwest.lat
					= loc.geometry.bounds.southwest.lat;
				areas[key].geometry.bounds.southwest.lng
					= loc.geometry.bounds.southwest.lng;
			} else {
				if (loc.geometry.bounds.northeast.lat < areas[key].geometry.bounds.northeast.lat)
					areas[key].geometry.bounds.northeast.lat = loc.geometry.bounds.northeast.lat;
				if (loc.geometry.bounds.northeast.lng > areas[key].geometry.bounds.northeast.lng)
					areas[key].geometry.bounds.northeast.lng = loc.geometry.bounds.northeast.lng;

				if (loc.geometry.bounds.southwest.lat > areas[key].geometry.bounds.southwest.lat)
					areas[key].geometry.bounds.southwest.lat = loc.geometry.bounds.southwest.lat;
				if (loc.geometry.bounds.southwest.lng < areas[key].geometry.bounds.southwest.lng)
					areas[key].geometry.bounds.southwest.lng = loc.geometry.bounds.southwest.lng;
			}

		}
		areas[key].geometry.location.lat =
			areas[key].geometry.bounds.northeast.lat +
				(areas[key].geometry.bounds.southwest.lat
					- areas[key].geometry.bounds.northeast.lat) / 2;
		areas[key].geometry.location.lng =
			areas[key].geometry.bounds.northeast.lng +
				(areas[key].geometry.bounds.southwest.lng
					- areas[key].geometry.bounds.northeast.lng) / 2;
	}

	console.log("Areas: " + Object.keys(areas).length);
	fs.writeFileSync(AREAS_JSON, JSON.stringify(areas));
	console.log("Locations: " + Object.keys(locations).length);
	fs.writeFileSync(LOCATIONS_JSON, JSON.stringify(locations));

}).run();
