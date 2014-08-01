Router.map(function() {
	this.route('map');
});

L.Icon.Default.imagePath = 'packages/leaflet/images';

Template.map.rendered = function() {
	var map = L.map('map').setView([32, 35], 8);
	//L.tileLayer.provider('HERE.satelliteDay').addTo(map);
	L.tileLayer.provider('OpenStreetMap.Mapnik').addTo(map);
	//L.control.layers.provided(['Esri.WorldImagery'], ['OpenStreetMap.Mapnik']).addTo(map);

	var markers = new L.MarkerClusterGroup();
	map.addLayer(markers);

	var now = new Date();
	redalert.messages.find({
		type: 'alert',
		createdAt: {
			$gt: new Date(now.getFullYear(), now.getMonth(), now.getDate())
		}
	}).forEach(function(doc) {
		var areas = _.map(doc.areas, function(id) {
			return RedAlert.areas.byId(id);
		});
		for (var i=0; i < areas.length; i++) {
			var geo = areas[i].geometry;
			markers.addLayer(new L.Marker(
				new L.LatLng(geo.location.lat, geo.location.lng),
				{ title: areas[i].name }
			));
			console.log(new L.Marker(
				new L.LatLng(geo.location.lat, geo.location.lng),
				{ title: areas[i].name }
			));
		}
	});

}