Router.map(function() {
	this.route('map');
});

L.Icon.Default.imagePath = 'packages/leaflet/images';

Template.map.rendered = function() {
	var map = L.map('map').setView([32, 35], 8);
	//L.tileLayer.provider('HERE.satelliteDay').addTo(map);
	L.tileLayer.provider('OpenStreetMap.Mapnik').addTo(map);
	//L.control.layers.provided(['Esri.WorldImagery'], ['OpenStreetMap.Mapnik']).addTo(map);

	var markers = new L.MarkerClusterGroup({

		// Only zoom if for multiple areas
		zoomToBoundsOnClick: false,

		// Show total alerts for cluster, not sum of alerts in each area
    iconCreateFunction: function(cluster) {
    	var markers = cluster.getAllChildMarkers();
    	var alertIds = [];
    	for (var i=0; i < markers.length; i++) {
    		var alertId = markers[i].options.alertId;
    		if (alertIds.indexOf(alertId) === -1)
    			alertIds.push(alertId);
    	}

			var c = ' marker-cluster-';
			if (alertIds.length < 10) {
				c += 'small';
			} else if (alertIds.length < 100) {
				c += 'medium';
			} else {
				c += 'large';
			}

      return new L.DivIcon({
      	html: '<div><span>' + alertIds.length + '</span></div>',
      	className: 'marker-cluster' + c,
      	iconSize: new L.Point(40, 40)
      });
    }		
	});

	markers.on('clusterclick', function (a) {
  	var markers = a.layer.getAllChildMarkers();
  	var lat = markers[0]._latlng.lat;
  	var multiple = false;
  	for (var i=1; i < markers.length; i++)
  		if (markers[i]._latlng.lat != lat) {
				multiple = true;
				break;
			}

		if (multiple)
			a.layer.zoomToBounds();
		else {
			var area = RedAlert.areas.byId(markers[0].options.areaId);
			var popup = L.popup()
		    .setLatLng(markers[0]._latlng)
		    .setContent('<p>'+area.name[Session.get('lang')]+'</p>')
		    .openOn(map);
		}
	});

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
				new L.LatLng(geo.location.lat, geo.location.lng), {
					alertId: doc._id, areaId: areas[i].id }
			));
		}
	});
}

/*
			if (geo.bounds) {
				var bounds = [
					[ geo.bounds.northeast.lat, geo.bounds.northeast.lng ],
					[ geo.bounds.southwest.lat, geo.bounds.southwest.lng ]
				];
				markers.addLayer(L.rectangle(bounds));
			} else {
*/