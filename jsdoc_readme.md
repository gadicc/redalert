Tzeva Adom API
--------------

NOTE: Although our API is *instant*, currently, external feeds are only scraped every 60 seconds.  There is no guarantee that we will be able to get a reliable feed from Pikud Ha'oref or Beeper, it's very possible we won't.
But in case we do, this code can be used to access it from your app / project (instantly).  I don't expect the API to change (much :)).

The Tzeva Adom project aggregates various alert sources and provides them to other developers in a consistent
format.  Past data can be retrieved via [alerts.html](../alerts.html) through various methods.  Thesse
classes allow the results to be processed, and also provides a class that can monitor for updates and call a
callback function whenever new data arrives.

We check for new data using long-polling (a technique for "reverse ajax" push), transported using JSONP (to allow
for cross-domain requests).  The data is served from a custom server written exactly for this purpose (see redalert.c on github), foregoing all the overhead in typical web servers to allow for minimum resource use for massive amounts of concurrent connections and messaging (I'll try arrange some benchmarks).

An example of how all this can be used is on the front page of [tzeva-adom.com](http://tzeva-adom.com/).

Example Code
============

Use [/test.php](../test.php) to test and don't miss working example [/example.html](../example.html).

**Example 1: Basic usage**

Load the supporting javascript classes from your header:
We require jQuery.parseJSON() as the only dependency.

	<script type="text/javascript" src="Alerts.js"></script>
	<script type="text/javascript" src="Areas.js"></script>

And place the following elsewhere in your code:

	// Initiate an Alerts object, with the URL to poll
	var alerts = new Alerts('http://tzeva-adom.com:8080/redalert');

	// Log any new data received to the console
	alerts.callback(function(data) { console.log(data); } );

	// Example processing (I'll add something like this to the API soon)
	alerts.callback(function(data) {
		for (var i=0; i < data.areas.length; i++)
			areas.add(data.areas[i]); 
		for (var i=0; i < data.alerts.length; i++) {
			var area = areas.byId(data.alerts[i].area_id);
			console.log('New alert for ' + area.name + ' at ' 
				+ new Date(data.alerts[i].time*1000).toString()
				+ ' (Location: ' + area.getLat() + ',' + area.getLong();
		}
	}

	// After your callbacks are declared, start the polling process
	alerts.poll();

**Example 2: Sound a siren if the user is in a new alert area**

This example shows how we could sound a siren if an alert comes for the user's current geolocation
(which we stored in user_loc).  See it in action at [http://tzeva-adom.com/](tzeva-adom.com)

	alerts.callback(function(data) {
		for (var i=0; i < data.areas.length; i++)
			areas.add(data.areas[i]); 
		if (user_loc)
			for (var i=0; i < data.alerts.length; i++) {
				if (areas.byId(data.alerts[i].area_id).containsGeo(user_loc)) {
					// new alert for user's location!
					siren.play();
				}
			}
	}


