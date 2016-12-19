import fs from 'fs';
import rp from 'request-promise';

// Set this to true once to rebuild the data from scratch
// If you abort midway, set back to false to continue rebuilding from
// where you left off.
const FORCE_REGEN = false;

const FETCH_GEODATA = true;        // query google for each location
const CALCULATE_BOUNDS = true;    // calculate the max bounds for each area
const AUGMENT_DATA = true;        // fill in English and blanks

const AREAS_JSON = '../areas.json';
const LOCATIONS_JSON = '../locations.json';

let areas = require(AREAS_JSON);
let locations = require(LOCATIONS_JSON);

function getLoc(locationName, areaId) {
  if (locations[locationName])
    return locations[locationName].id;

  const id = Object.keys(locations).length + 1;
  locations[locationName] = { id: id, name: locationName, areaId: areaId };
  return id;
}

const coverTimeMap = {
  "מיידי": 0,
  "15 שניות": 15,
  "30 שניות": 30,
  "45 שניות": 45,
  "דקה": 60,
  "דקה וחצי": 90,
  "3 דקות": 180,
};

if (FORCE_REGEN || !areas) {
  areas = {}; locations = {};
  console.log('Regenerating region mapping...');

  // 11 July 2014
  // http://hospitals.clalit.co.il/Hospitals/kaplan/he-il/CustomerInfo/KaplanNews/News2014/TzukEitan/Pages/Polygon.aspx
  const locs = fs.readFileSync('pikud_areas2.csv').toString().split('\n');

  for (let i=1; i < locs.length; i++) {
    const row = locs[i].split(',');
    if (row == "")  continue;

    // An "area" is the "merhav", like "שרון 138", "שרון 143", etc.
    const locationName = row[0];                        // הרצליה
    const coverTimeText = row[1];                        // דקה וחצי
    const areaFullName = row[2].trim();                  // דן 155
    const areaComponents = areaFullName.match(/^(.*) ([0-9]+)$/);
    const regionName = areaComponents[1];                // דן
    const areaId = parseInt(areaComponents[2]);          // 155

    const coverTime = coverTimeMap[coverTimeText];
    if (!coverTime)
      console.log('Unknown covertime: ' + coverTimeText);

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
  for (let name in name_locs)
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
  let address = `${locationName}, ${regionName}, ישראל`;
  let uri = geocodeUriBase + encodeURIComponent(address);
  let body = await rp({ uri, method: 'GET', json: true });
  console.log(address);
  await sleep(50);  // Keep in line with Google's rate-limiting

  if (body.status === 'ZERO_RESULTS') {
    address = `${locationName}, ישראל`;
    uri = geocodeUriBase + encodeURIComponent(address);
    body = await rp({ uri, method: 'GET', json: true });
    console.log(address);
    await sleep(50);
  }

  console.log(body);
  return body.results;
}

const regionNameMap = {
  'אילת': 'Eilat',
  'ערבה': 'Arava',
  'נגב': 'Negev',
  'באר שבע': 'Beersheba',
  'אשקלון': 'Ashkelon',
  'עוטף עזה': 'Gaza Perimeter',
  'ים המלח': 'Dead Sea',
  'יהודה': 'Yehuda',
  'אשדוד': 'Ashdod',
  'מעלה אדומים': 'Maaleh Adumim',
  'ירושלים': 'Jerusalem',
  'בית שמש': 'Beit Shemesh',
  'בקעה': 'Bik\'a',
  'שומרון': 'Shomron',
  'שפלה': 'Shfela',
  'דן': 'Dan',
  'שרון': 'Sharon',
  'עמק חפר': 'Hefer Valley',
  'עירון': 'Iron',
  'מנשה': 'Menashe',
  'בקעת בית שאן': 'Beit She\'an Valley',
  'עמק יזרעאל': 'Jezreel Valley',
  'כרמל': 'Carmel',
  'תבור': 'Tavor',
  'הקריות': "Kiriyot",
  'חיפה': "Haifa",
  'גליל תחתון': "Lower Galilee",
  'גליל עליון': "Upper Galilee",
  'קצרין': "Kazrin",
  'גולן': 'Golan',
  'קו העימות': 'Frontline',
};

(async function() {
  const length = Object.keys(locations).length;
  let i=0, added=0;

  if (FETCH_GEODATA)
  for (let key in locations) {
    i++;
    if (!locations[key].geodata || 0 && !locations[key].geodata.length) {
      added++;
      console.log(i + '/' + length + ': ' + locations[key].name + ' ('
        + Math.round(i / length * 100) + '%)');
      locations[key].geodata = await get_geodata(
        locations[key].name,                      // הרצליה
        areas[locations[key].areaId].region.he    // דן
      );
      console.log(locations[key].geodata);

      // save to disk every 10 entries
      if (added % 10 == 0) {
        console.log('sync');
        fs.writeFileSync(LOCATIONS_JSON, JSON.stringify(locations));
      }
    }
  }

  if (CALCULATE_BOUNDS)
  for (let key in areas) {
    areas[key].geometry = {
      bounds: { northeast: {}, southwest: {} },
      location: {}
    };

    if (areas[key].locations)
    for (let i=0; i < areas[key].locations.length; i++) {
      const loc = locations[areas[key].locations[i]].geodata[0];

      if (!loc)
        continue;

      // TODO, check if location is inside of bounds, otherwise extend

      if (!loc.geometry.bounds)
        continue;

      if (!areas[key].geometry.bounds.northeast.lat) {
        areas[key].geometry.bounds.northeast.lat = loc.geometry.bounds.northeast.lat;
        areas[key].geometry.bounds.northeast.lng = loc.geometry.bounds.northeast.lng;
        areas[key].geometry.bounds.southwest.lat = loc.geometry.bounds.southwest.lat;
        areas[key].geometry.bounds.southwest.lng = loc.geometry.bounds.southwest.lng;
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
        (areas[key].geometry.bounds.southwest.lat -
          areas[key].geometry.bounds.northeast.lat) / 2;
    areas[key].geometry.location.lng =
      areas[key].geometry.bounds.northeast.lng +
        (areas[key].geometry.bounds.southwest.lng -
          areas[key].geometry.bounds.northeast.lng) / 2;
  }

  // Arava 120, Yam Hamelech 90

  if (AUGMENT_DATA)
  for (let key in areas) {
    let area = areas[key];

    if (!area.region.he)
      area.region = { he: "מרחב " + area.id }

    if (!area.region.en)
      area.region.en = regionNameMap[area.region.he];
    if (!area.region.en)
      console.log("No english name for: " + area.region.he);

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
