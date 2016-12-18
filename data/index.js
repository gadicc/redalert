const AREAS_JSON = './areas.json';
const LOCATIONS_JSON = './locations.json';
const FORCE_REGEN = true; //false;

const fs = require('fs');
const http = require('http');

const rp = require('request-promise');

let areas = require(AREAS_JSON);
let locations = require(LOCATIONS_JSON);

function getLoc(locationName, areaId) {
	if (locations[locationName])
		return locations[locationName].id;

	const id = Object.keys(locations).length + 1;
	locations[locationName] = { id: id, name: locationName, areaId: areaId };
	return id;
}

if (FORCE_REGEN || !areas) {
	areas = {}; locations = {};
	console.log('Regenerating region mapping...');

	// 11 July 2014
	// http://hospitals.clalit.co.il/Hospitals/kaplan/he-il/CustomerInfo/KaplanNews/News2014/TzukEitan/Pages/Polygon.aspx
	const locs = fs.readFileSync('pikud_areas2.csv').toString().split('\n');

	for (let i=1; i < locs.length; i++) {
		const row = locs[i].split(',');
		if (row == "")
			continue;

		// An "area" is the "merhav", like "שרון 138", "שרון 143", etc.
		const locationName = row[0];												// הרצליה
		const coverTimeText = row[1];												// דקה וחצי
		const areaFullName = row[2].trim();									// דן 155
		const areaComponents = areaFullName.match(/^(.*) ([0-9]+)$/);
		const regionName = areaComponents[1];								// דן
		const areaId = parseInt(areaComponents[2]);					// 155

		let coverTime;
		switch(coverTimeText) {
			case "מיידי": coverTime = 0; break;
			case "15 שניות": coverTime = 15; break;
			case "30 שניות": coverTime = 30; break;
			case "45 שניות": coverTime = 45; break;
			case "דקה": coverTime = 60; break;
			case "דקה וחצי": coverTime = 90; break;
			case "3 דקות": coverTime = 180; break;
			default:
			console.log('Unknown covertime: ' + coverTimeText);
		}

		// console.log(`areas[${areaId}]: { regionName: "${regionName}", coverTime: ${coverTime} }`);

		if (!areas[areaId]) {
			areas[areaId] = {
				id: areaId,
				region: { he: regionName },
				name: { he: areaFullName },
				coverTime: coverTime,
				locations: []
			};
		}

		const loc = getLoc(locationName, areaId);
		if (areas[areaId].locations.indexOf(loc) === -1) {
			areas[areaId].locations.push(loc);
		}
	}

	const name_locs = locations;
	locations = {};
	for (name in name_locs)
		locations[name_locs[name].id] = name_locs[name];
}

// ???
/*
areas[216] = {
	id: 216,
	region: { he: "עוטף עזה" },
	name: { he: "עוטף עזה 216" },
	coverTime: 15,
	locations: [ getLoc("יושיביה", 216), getLoc("תקומה", 216) ]
};
locations[getLoc("יושיביה", 216)] = locations["יושיביה"];
locations[getLoc("תקומה", 216)] = locations["תקומה"];
delete(locations["תקומה"]);
delete(locations["יושיביה"]);
*/

async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

const geocodeUriBase = 'http://maps.googleapis.com/maps/api/geocode/json?address=';
async function get_geodata(locationName, regionName) {
	const address = `${locationName}, ${regionName}, ישראל`;
	const uri = geocodeUriBase + encodeURIComponent(address);
	console.log(address);

	const body = await rp({ uri, method: 'GET', json: true });
	console.log(body);
	return body.results;
}

(async function() {
	const length = Object.keys(locations).length;
	let i=0, added=0;

	if (1) // fetch geodata
	for (let key in locations) {
		i++;
		if (!locations[key].geodata || 0 && !locations[key].geodata.length) {
			added++;
	 		console.log(i + '/' + length + ': ' + locations[key].name + ' ('
	 			+ Math.round(i / length * 100) + '%)');
			locations[key].geodata = await get_geodata(
				locations[key].name,											// הרצליה
				areas[locations[key].areaId].region.he		// דן
			);
			console.log(locations[key].geodata);
	 		await sleep(50);
	 		if (added % 10 == 0) {
	 			console.log('sync');
				fs.writeFileSync(LOCATIONS_JSON, JSON.stringify(locations));
	 		}
	 	}
	}

	if (1) // calculate bounds
	for (let key in areas) {
		areas[key].geometry = {
			bounds: { northeast: {}, southwest: {} },
			location: {}
		}
		if (areas[key].locations)
		for (let i=0; i < areas[key].locations.length; i++) {
			const loc = locations[areas[key].locations[i]].geodata[0];

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
	for (key in areas) {
		let area = areas[key];

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

})();
