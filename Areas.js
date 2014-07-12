// Gadi Cohen nov2012 GPLed

/* ------ Area -------- */

/**
  * Intiatilizes a new Area object.
  * @class Area
  * @constructor
  *
  * @param id   - area_id of the object
  * @param name - area_name of the object
  * @param data - area_json of the object, a json object containing the area's geodata
  *               generally the output of http://maps.google.com/maps/geo?q=AREA_NAME
  *
  * @return       an Area object for the given data
  */ 
function Area(id, name, data) {
	this.id = id;
	this.name = name;
	this.data = jQuery.parseJSON(data);
}

/**
  * Returns the areas lattitude
  */
Area.prototype.getLat = function() {
	if (this.api == 2)
		return this.data.Placemark[0].Point.coordinates[1];
	return this.data.results[0].geometry.location.lat;
}
/**
  * Returns the areas longitude
  */
Area.prototype.getLong = function() {
	if (this.api == 2)
		return this.data.Placemark[0].Point.coordinates[0];
	return this.data.results[0].geometry.location.lng;
}

/**
  * Google's geodata gives is the coordinates of the northern-, southern-,
  * eastern- and western-most boundries of the area.  The function below
  * will see if the given point is within these boundries.
  *
  * @param   lat    Latitude
  * @param   long   Longitude
  * @return  true   if the location is in or near the city
  *          false  if the location is definitely out of the city
  */
Area.prototype.contains = function(lat, long) {
	if (!this.data || (!this.data.Placemark && !this.data.results)) {
		console.log(this.name + '(' + this.id + ') is missing data');
		console.log(this.data);
		return;
	}

	if (this.api == 2) {
		var box = this.data.Placemark[0].ExtendedData.LatLonBox;
		return lat > box.south && lat < box.north && long > box.west && long < box.east;
	}

	var bounds = this.data.results[0].geometry.bounds;
	return lat > bounds.southwest.lat
		  && lat < bounds.northeast.lat
		  && long > bounds.southwest.lng
		  && long < bounds.northeast.lng;
}

/**
  * Shortcut to Area.contains() using a geolocation object (e.g user's location from browser).
  */
Area.prototype.containsGeo = function (geoloc) {
	return this.contains(geoloc.coords.latitude, geoloc.coords.longitude);
}

/* ------ AreaS ------- */

/**
  * Areas class constructor (note the S, a collection of areas)
  * @constructor
  */
function Areas() {
	this.all = [];
}

/**
  * Finds an area by name (that has been previously added using areas.add())
  *
  * @param name  An area_name as found in the database
  * @return      An Area object for the given name
  *              Null if one couldn't be found
  */
Areas.prototype.byName = function(name) {
	for (var i=0; i < this.all.length; i++)
		if (this.all[i].name == name)
			return this.all[i];
	return null;
}

/**
  * Finds an area by ara_id (that has been previously added using areas.add())
  *
  * @param id  A city's area_id from the database
  * @return    An Area object for the given name
  *            Null if one couldn't be found
  */
Areas.prototype.byId = function(id) {
	for (var i=0; i < this.all.length; i++)
		if (this.all[i].id == id)
			return this.all[i];
	return null;
}

/**
  * Adds an area to the current Areas object.
  *
  * @param data   JSON containing area info from the database
  */
Areas.prototype.add = function(data) {
	var area = new Area(data.area_id, data.area_name, data.area_json);
	this.all.push(area);
}


/* Init code */

/*
the below is temporary, alerts.php will soon return identical output to what the
Alerts class gets (the new format), i.e, alerts, and all the area info for
the alerts returned.  As such, "areas.php" will no longer be called and the
file will be removed soon.
*/

var areas = new Areas();

$.ajax({
	url: 'areas.php',
	dataType: 'json',
	success: function(data) {
		for (var i=0; i < data.length; i++) {
			areas.add(data[i]);
		}
	}
});

