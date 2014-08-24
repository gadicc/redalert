## RedAlert API v2

For an example app using the API, see
http://redalert.gadi.cc/ (source is in the `app` directory of this repo).

To use the API, simply include the script in your site header:

```html
<script type="text/javascript" src="http://redalert.gadi.cc/redalert.js"></script>
```

and then:

```
<script type="text/javascript">
	RedAlert.on('msg', ... etc ... );
	RedAlert.init();
</script>
```

Or, to load asynchronously using, e.g. jQuery:

```js
jQuery.ajax({
  crossDomain: true,
  dataType: 'script',
  url: 'http://redalert.gadi.cc/redalert.js',
  error: function() {
    console.log('fail', this, arguments);
  },
  success: function() {
    RedAlert.on('msg', function(msg) {
    	// .. etc ...
    });
    RedAlert.init();
  }
);
```

**Note**:
1. jQuery is a dependency
1. The URL will change once development is complete.

The script will:

* Connect to the server and reconnect as necessary
* Keep retrieved data in localStorage, only fetch new data on reconnect
* Retrieve+cache area and location data, and load new revisions
* Request user's geolocation, keep up to date, and use to tag alerts
* Provide the API given below

## Events

```js
RedAlert.on('ready', function() {
	// After area/location data loaded and we have initiated a connect
});

RedAlert.on('msg', function(msg) {
	if (typeof msg !== 'number') {  // ping
		// See below for msg format
		if (msg.inCurrentArea)
			siren.play();
	}
});

// RedAlert.status updated: connected, connecting, disconnected
RedAlert.on('status', func(status));

// RedAlert.currentPosition was updated
RedAlert.on('position', func(pos));

// RedAlert.currentArea was updated
RedAlert.on('newArea', func(newArea, oldArea));   
```

## Message Format

```js
{
	_id: 2823,                // Unique sequential redalert ID
	pid: 1408874682832,       // Pikud Haoref ID (time in IST w/ bad clock)
	time: 1408863885570,      // Time redalert retrieved the alert
	areas: [221, 155]         // Array of affected area IDs
}
```

## API

### RedAlert

Properties

* `RedAlert.status` - connected/connecting/disconnected: on('status')
* `RedAlert.currentPosition` - user's current geolocation: on('position')
* `RedAlert.currentArea` - current Merhav user is in: on('newArea')

Methods

* `RedAlert.init()` - call after setting up your callbacks: on('...')
* `RedAlert.resetStorage()` - clear cache
* `RedAlert.toRad(deg)` - convert degrees to radians
* `RedAlert.distance(pos1, pos2)`	- distance between two lat/lng pairs

### RedAlert.messages

```js
RedAlert.find({
	// The QUERY syntax resembled Mongo but not everything is implemented
	// All arguments are optional and can be mixed and matched
	type: 'alert',
	areas: 155,											// 155 appears inside area array
	time: {
		$gt: new Date(date),					// Time property is greater than arg
		$lt: new Date(date)						// Time property is less than arg
	}
}, {
	// The OPTIONS syntax resembles Mongo but not everything is implemented
	sort: { time: -1 }							// Sort results from latest to oldest
	limit: 10 											// Only return 10 results
});

// Raw data is in RedAlert.messages; an array of all received messages
```

### RedAlert.areas + RedAlert.locations

A location is a generally a city.  An area is a Pikud Ha'oref Merhav.
As such, an alert will be for one or more "areas", and each area will
contain one or more locations.  More info on how we generate this in
the `data` directory.

Upgrading from v1?  Previously there was no concept of areas
(merhavim).  v1 "areas" are essentially renamed to "locations" in
v2, with more info.  Alerts contain only area (merhavim) IDs instead
of all the locations each time.  Use locations.byAreaId() to get
all the locations in a certain area.

Common to RedAlert.areas and RedAlert.locations:

* `.byId(id)` - gets by area ID or location ID
* `.byName(name)` - regex match against the name property

Other methods:

* `RedAlert.locations.byAreaId(areaId)` - find locations in this area
* `RedAlert.areas.fromPos(pos)` - find most likely area for lat/lng pair

Area format:

```js
RedAlert.areas.byId(155);
{
	id: 155,
	region: {he: "דן", en: "Dan"},
	name: {he: "דן 155", en: "Dan 155"},
	locations: [1111, 1112, 1113, 1114, 1115],
	coverTime: 90,
	geometry: {
		bounds: {
			northeast: { lat: 32.158889, lng: 34.86803 },
			southwest: { lat: 32.1774249, lng: 34.7913391 }
		},
		location: {
			lat: 32.16815695,
			lng: 34.82968455
		}
	}
}
```

Location format:
```js
RedAlert.locations.byName('תל אביב');
{
	id: 1116,
	areaId: "157",
	name: "תל אביב יפו",
	geodata: { /* result of Google Maps geodecode query */ }
}
RedAlert.locations.byName('תל אביב').geodata;
[
	{
		address_components: [
			{ long_name: "Tel Aviv", short_name: "ת\"א",
				types: [ "locality", "political"] },
			{ long_name: "Israel", short_name: "IL",
				types: [ "country", "political"] }
		],
		formatted_address: "Tel Aviv, Israel",
		geometry: {
			bounds: {
				northeast: { lat: 32.1465074, lng: 34.8519761 },
				southwest: { lat: 32.0292531, lng: 34.7425159 }
			},
			location: {
				lat: 32.0852999, lng: 34.78176759999999
			},
			location_type: "APPROXIMATE",
			viewport: {
				northeast: { lat: 32.1465074, lng: 34.8519761 },
				southwest: { lat: 32.0292531, lng: 34.7425159 }
			}
		}
		types: [ "locality", "political" ]
	},
	{
		/* similar for "Jaffa, Tel Aviv, Israel" */
	}
]
```

## Behind the scenes

The script opens a hidden iframe with a keep-alive HTML request, which
sends data back in `<script>` tags (the code is executed after every
close tag).  Each piece of data is then processed and made available
via the `on('msg')` eventHandler.

### Accessing from another server

We recommend that that you simply use our script and let each user connect
to the server, since, the server was especially written for this purpose
and can handle mass load.

However, perhaps you have a need to have your own server get data from us.
At this stage, the server only provides data in the format mentioned above, 
although other formats may be made available in the future.

So, you need to open a regular HTTP request, according to the format mentioned
in this script (e.g. 
`http://http://api1.tzeva-adom.com/redalert?ts=1408867536804&limit=100000`
or with `lastId=X`) and handle
each "data received" event (e.g. `on('data')` in node).  Strip the script
tags, function call and process the JSON.
