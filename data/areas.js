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

	// 11 July 2014
	// http://hospitals.clalit.co.il/Hospitals/kaplan/he-il/CustomerInfo/KaplanNews/News2014/TzukEitan/Pages/Polygon.aspx
	var row, areaName, areaId, loc, time;
	var locs = fs.readFileSync('pikud_areas2.csv').toString().split('\n');
	for (var i=1; i < locs.length; i++) {
		row = locs[i].split(',');
		if (row == "")
			continue;
		loc = row[0]; coverTime = row[1]; areaName = row[2].trim();
		areaId = areaName.match(/([0-9]+)$/)[1];

		switch(coverTime) {
			case "מיידי": coverTime = 0; break;
			case "15 שניות": coverTime = 15; break;
			case "30 שניות": coverTime = 30; break;
			case "45 שניות": coverTime = 45; break;
			case "דקה": coverTime = 60; break;
			case "דקה וחצי": coverTime = 90; break;
			case "3 דקות": coverTime = 180; break;
			default:
			console.log('Unknown covertime: ' + coverTime);
		}

		//console.log('loc: ' + loc + ', time: ' + time + ', area:' + area);

		if (!areas[areaId]) {
			areas[areaId] = {
				id: parseInt(areaId),
				region: { he: areaName.match(/^(.*) [0-9]+$/)[1] },
				name: { he: areaName },
				coverTime: coverTime,
				locations: []
			};
		}

		loc = getLoc(loc, areaId);
		if (areas[areaId].locations.indexOf(loc) === -1) {
			areas[areaId].locations.push(loc);
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

	if (1) // fetch geodata
	for (key in locations) {
		i++;
		if (!locations[key].geodata || 0 && !locations[key].geodata.length) {
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

	if (1) // calculate bounds
	for (key in areas) {
		areas[key].geometry = {
			bounds: { northeast: {}, southwest: {} },
			location: {}
		}
		if (areas[key].locations)
		for (var i=0; i < areas[key].locations.length; i++) {
			var loc = locations[areas[key].locations[i]].geodata[0];

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

	// Arava 120, Yam Hamelech 90

	if (1) // do english, fill in blanks
	var area;
	for (key in areas) {
		area = areas[key];

		if (!area.region.he)
			area.region = { he: "מרחב " + area.id }

		switch(area.region.he) {
			case 'אילת':
				area.region.en = 'Eilat';
				// area.coverTime = 30;
				break;
			case 'ערבה':  // MISSING
				area.region.en = 'Arava';
				// area.coverTime = 180;
			case 'נגב':
				area.region.en = 'Negev';
				// area.coverTime = 90;
				break;
			case 'באר שבע':
				area.region.en = 'Beersheba';
				// area.coverTime = 45;   // TODO, 60
				break;
			case 'אשקלון':
				area.region.en = 'Ashkelon';
				// area.coverTime = 30;
				break;
			case 'עוטף עזה':
				area.region.en = 'Gaza Perimeter';
				// area.coverTime = 15;
				break;
			case 'ים המלח': // MISSING
				area.region.en = 'Dead Sea';
				// area.coverTime = 90;
			case 'יהודה':
				area.region.en = 'Yehuda';
				// area.coverTime = 90;
				break;
			case 'אשדוד':
				area.region.en = 'Ashdod';
				// area.coverTime = 45;  // TODO, 60
				break;
			case 'מעלה אדומים':
				area.region.en = 'Maaleh Adumim';
				// area.coverTime = 90;
				break;
			case 'ירושלים':
				area.region.en = 'Jerusalem';
				// area.coverTime = 90;
				break;
			case 'בית שמש':
				area.region.en = 'Beit Shemesh';
				// area.coverTime = 90;
				break;
			case 'בקעה':
				area.region.en = 'Bik\'a';
				// area.coverTime = 90;
				break;
			case 'שומרון':
				area.region.en = 'Shomron';
				// area.coverTime = 90;
				break;
			case 'שפלה':
				area.region.en = 'Shfela';
				// area.coverTime = 90;
				break;
			case 'דן':
				area.region.en = 'Dan';
				// area.coverTime = 90;
				break;
			case 'שרון':
				area.region.en = 'Sharon';
				// area.coverTime = 90;
				break;
			case 'עמק חפר':
				area.region.en = 'Hefer Valley';
				// area.coverTime = 90;
				break;
			case 'עירון': // MISSING
				area.region.en = 'Iron';
				// area.coverTime = 90;
			case 'מנשה':
				area.region.en = 'Menashe';
				// area.coverTime = 90;
				break;
			case 'בקעת בית שאן': // MISSING
				area.region.en = 'Beit She\'an Valley';
				// area.coverTime = 60;
			case 'עמק יזרעאל': // MISSING
				area.region.en = 'Jezreel Valley';
				// area.coverTime = 60;
			case 'כרמל':
				area.region.en = 'Carmel';
				// area.coverTime = 60;
				break;
			case 'תבור': // MISSING
				area.region.en = 'Tavor';
				// area.coverTime = 60;
			case 'הקריות': // MISSING
				area.region.en = "Kiriyot";
				// area.coverTime = 60;
			case 'חיפה': // MISSING
				area.region.en = "Haifa";
				// area.coverTime = 60;
			case 'גליל תחתון': // MISSING
				area.region.en = "Lower Galilee";
				// area.coverTime = 60;
			case 'גליל עליון': // MISSING
				area.region.en = "Upper Galilee";
				// area.coverTime = 30;
			case 'קצרין': // MISSING
				area.region.en = "Kazrin";
				// area.coverTime = 15;
			case 'גולן':
				area.region.en = 'Golan';
				// area.coverTime = 0;
				break;			
			case 'קו העימות':
				area.region.en = 'Frontline';
				// area.coverTime = 0;
				break;
			case 'undefined':
				break;
			default:
				console.log(areas[key].region);
		}
		if (area.region.en)
			area.name.en = area.region.en + ' ' + area.id;
		else
			area.name.en = "Area " + area.id;
	}

	console.log("Areas: " + Object.keys(areas).length);
	fs.writeFileSync(AREAS_JSON, JSON.stringify(areas));
	console.log("Locations: " + Object.keys(locations).length);
	fs.writeFileSync(LOCATIONS_JSON, JSON.stringify(locations));

}).run();
