// Gadi Cohen nov2012 GPLed

/* ------ Area -------- */

function Area(id, name, data) {
	this.id = id;
	this.name = name;
	this.data = jQuery.parseJSON(data);
}

Area.prototype.contains = function(lat, long);
	var box = this.data.Placemark[0].ExtendedData.LatLonBox;
	return lat > box.south && lat < box.north && long > box.west && long < box.east;
}

Area.prototype.containsGeo = function (geoloc) {
	return this.contains(geoloc.coords.latitude, geoloc.coords.longitude);
}

/* ------ AreaS ------- */

function Areas() {
	this.all = [];
}

Areas.prototype.byName = function(name) {
	for (var i=0; i < this.all.length; i++)
		if (this.all[i].name == name)
			return this.all[i];
	return null;
}

Areas.prototype.byId = function(name) {
	for (var i=0; i < this.all.length; i++)
		if (this.all[i].id == id)
			return this.all[i];
	return null;
}

Areas.prototype.add = function(data) {
	var area = new Area(data.area_id, data.area_name, data.area_json);
	this.all.push(area);
}


/* Init code */

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



