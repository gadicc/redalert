Router.map(function() {
	this.route('map');
});

L.Icon.Default.imagePath = 'packages/leaflet/images';

Session.setDefault('mapRange', 'today');

var mapObserve = function(markers) {
	var now = new Date();
	var query = {
		type: 'alert'
	};
	var range = Session.get('mapRange');
	if (range == 'today')
		query.time = {
			$gt: new Date(now.getFullYear(), now.getMonth(), now.getDate())
		};
	markers.clearLayers();

	var data = [];
	var docs = redalert.find(query).fetch();
	_.each(docs, function(doc) {
		var areas = _.map(doc.areas, function(id) {
			return RedAlert.areas.byId(id);
		});
		for (var i=0; i < areas.length; i++) {
			var geo = areas[i].geometry;
			if (geo && geo.location && geo.location.lat)
			data.push(new L.Marker(
				new L.LatLng(geo.location.lat, geo.location.lng), {
					alertId: doc._id, areaId: areas[i].id }
			));
		}		
	});
	markers.addLayers(data);

	// Watch for future adds and add individually
	query.time = { $gt: docs[docs.length-1].time };
	return redalert.find(query).observe({
		added: function(doc) {
			var areas = _.map(doc.areas, function(id) {
				return RedAlert.areas.byId(id);
			});
			for (var i=0; i < areas.length; i++) {
				var geo = areas[i].geometry;
				if (geo && geo.location && geo.location.lat)
				markers.addLayer(new L.Marker(
					new L.LatLng(geo.location.lat, geo.location.lng), {
						alertId: doc._id, areaId: areas[i].id }
				));
			}
		}
	});
}

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
			var bounds = area.geometry.bounds;
			var layer = null;

			if (bounds) {
				bounds = [
					[ bounds.northeast.lat, bounds.northeast.lng ],
					[ bounds.southwest.lat, bounds.southwest.lng ]
				];
				layer = L.rectangle(bounds);
				map.addLayer(layer);
			}

			var popup = L.popup()
		    .setLatLng(markers[0]._latlng)
		    .setContent('<p>'+area.name[Session.get('lang')]+'</p>')
		    .openOn(map)
		    .on('close', function() {
		    	if (layer)
			    	map.removeLayer(layer);
		    });
		}
	});

	this.handles = [null];

	this.handles.push(Deps.autorun(function() {
		$('#map').height(rwindow.get('$height') - $('#header').height());
		map.invalidateSize();
	}));

	var self = this;
	this.handles.push(Deps.autorun(function() {
		if (self.handles[0])
			self.handles[0].stop();
		self.handles[0] = mapObserve(markers);
	}));

	map.addLayer(markers);
}

Template.map.events({
	'click #map-controls a': function() {
		Session.set('mapRange',
			Session.get('mapRange') == 'today' ? 'all' : 'today');
	}
});

Template.map.helpers({
	range: function() {
		return Session.get('mapRange');
	}
})

Template.map.destroyed = function() {
	if (this.handles)
	for (var i=0; i < this.handles; i++)
		if (this.handles[i].stop)
			this.handles[i].stop();
};