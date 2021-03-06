RedAlert = {
  host: 'api1.tzeva-adom.com:80',
  //host: window.location.hostname + ':8080',
  initted: false,
  reduce: 15000,

	iframe: null,
  messages: [],
  areas: { data: {} },
  locations: { data: {} },
  serials: {
    desired: { areas: 7, locations: 7, data: 6 },
    stored: { areas: 0, locations: 0, data: 0 }
  },
	lastMessage: { },
  lastId: 0,

	status: 'disconnected',
	setStatus: function(status) {
		RedAlert.status = status;
  	for (var i=0; i < RedAlert.hooks.status.length; i++)
  		RedAlert.hooks.status[i].call(this, status);  		
	},

	hooks: { msg: [], status: [], ready: [], remove: [], position: [], newArea: [] },

	connect: function() {
		console.log('RedAlert connecting...');
  	var url = 'http://'+RedAlert.host+'/redalert?ts=' + new Date().getTime();
    if (RedAlert.lastId)
      url += '&lastId=' + RedAlert.lastId;
    else
      url += '&limit=100000';
    RedAlert.iframe[0].src = url;
  	RedAlert.setStatus('connecting');
  	RedAlert.initConnect = new Date();
	},
	on: function(hook, func) {
		RedAlert.hooks[hook].push(func);
	},

  resetStorage: function() {
    var keys = ['ra_lastId', 'ra_messages', 'ra_areas', 'ra_locations', 'ra_serials'];
    for (var i=0; i < keys.length; i++)
      localStorage.removeItem(keys[i]);
  },

  toRad: function(deg) {
    return deg * Math.PI / 180;
  },
  distance: function(pos1, pos2) {
    // Based on http://www.movable-type.co.uk/scripts/latlong.html

    var R = 6371; // km
    var φ1 = RedAlert.toRad(pos1.lat);
    var φ2 = RedAlert.toRad(pos2.lat);
    var Δφ = RedAlert.toRad(pos2.lat-pos1.lat);
    var Δλ = RedAlert.toRad(pos2.lng-pos1.lng);

    var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    var d = R * c;
    return d;
  }
};

RedAlert.areas.byId = RedAlert.locations.byId = function(id) {
  return this.data[id];
};
RedAlert.areas.byName = RedAlert.locations.byName = function(name) {
  for (key in this.data)
    if (this.data[key].name.match(name))
      return this.data[key];
};
RedAlert.locations.byAreaId = function(id) {
  var locs = RedAlert.areas.byId(id).locations;
  return _.map(locs, function(id) {
    return RedAlert.locations.byId(id);
  });
};
RedAlert.areas.fromPos = function(pos) {
  var area, bounds, distance, shortest, shortestId = null;
  pos = pos.lat ? pos : { lat:pos.coords.latitude, lng:pos.coords.longitude };

  if (!RedAlert.areas.data)
    return null;

  for (key in RedAlert.areas.data) {
    area = RedAlert.areas.data[key];
    if (!(area && area.geometry && area.geometry.location
        && area.geometry.location.lat && area.geometry.location.lng))
      continue;

    distance = RedAlert.distance(pos, area.geometry.location);

    if (!shortest || distance < shortest) {
      shortest = distance;
      shortestId = key;
    }
  }
  return RedAlert.areas.data[shortestId];
};

// Adapted binary search, use properties, find closest value
// http://stackoverflow.com/questions/6553970/find-the-first-element-in-an-array-that-is-greater-than-the-target
Array.prototype.binGtProp = function(prop, val) {
  var low = 0, high = this.length, mid;
  while (low != high) {
    mid = Math.floor((low + high) / 2);
    if (this[mid][prop] <= val)
      low = mid+1;
    else
      high = mid;
  }
  return low;
};
Array.prototype.binLtProp = function(prop, val) {
  var low = 0, high = this.length, mid;
  while (low != high) {
    mid = Math.ceil((low + high) / 2);
    if (this[mid][prop] >= val)
      high = mid-1;
    else
      low = mid;
  }
  return low;
};

RedAlert.find = function(query, options) {
  if (!query) query = {};
  if (!options) options = {};

  var data = RedAlert.messages;

  // Queries by filter
  if (query.areas)
    data = _.filter(data, function(doc) {
      return _.contains(doc.areas, query.areas);
    });

  // Queries by range
  var start = 0;
  var end = data.length;
  if (query.time) {
    if (query.time.$gt) {
      if (typeof query.time.$gt === 'object')
        query.time.$gt = query.time.$gt.getTime();
      start = data.binGtProp('time', query.time.$gt);
    }
    if (query.time.$lt)
      if (typeof query.time.$lt === 'object')
        query.time.$lt = query.time.$lt.getTime();
      if (typeof end === 'object') end = end.getTime();
  }

  // Options
  if (options.limit) {
    var desiredStart;

    if (1) { // from end 
      desiredStart = end - options.limit;
      if (desiredStart > start)
        start = desiredStart;
    }
  }

  data = data.slice(start,end);
  if (options.sort && options.sort.time == -1)
    data = data.reverse();

  return data;
}

// attach the .equals method to Array's prototype to call it on any array
// http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}   

// http://snippetrepo.com/snippets/debounce-util
function debounce (func) {
    var delay = 1000;
    var timer = null;
    return function () {
        if (timer !== null) {
            clearTimeout(timer);
            timer = null;
        }
        var args = arguments;
        timer = setTimeout(function () {
            func.apply(null, args);
        }, delay);
    };
}

http://remysharp.com/2010/07/21/throttling-function-calls/
function throttle(fn, threshhold, scope) {
  threshhold || (threshhold = 250);
  var last,
      deferTimer;
  return function () {
    var context = scope || this;

    var now = +new Date,
        args = arguments;
    if (last && now < last + threshhold) {
      // hold on to it
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function () {
        last = now;
        fn.apply(context, args);
      }, threshhold);
    } else {
      last = now;
      fn.apply(context, args);
    }
  };
}

RedAlert.saveData = throttle(function() {
  if (typeof localStorage === 'undefined')
    return;

  localStorage.setItem('ra_lastId', RedAlert.lastId);
  localStorage.setItem('ra_messages', JSON.stringify(RedAlert.messages));
});

function idSort(a, b) {
  return a._id - b._id;
}

window.addEventListener("message", receiveMessage, false);
// receiveMessage({data:'redalert {"_id": '+(1000+RedAlert.messages.length)+', "areas": [155], "time": '+new Date().getTime()+'}'});
function receiveMessage(event) {
  if (event.data.substr(0, 9) != "redalert ")
    return;

  RedAlert.lastMessage.receivedAt = new Date();
  if (RedAlert.status !== 'connected') {
    console.log('RedAlert connected');
    RedAlert.setStatus('connected');
  }

  var data = JSON.parse(event.data.substr(9));
  if (typeof data === "number") {  
    RedAlert.lastMessage.sentAt = data;
    RedAlert.lastMessage.latency = RedAlert.lastMessage.receivedAt - data;
  } else {
    if (data._id > RedAlert.lastId)
      RedAlert.lastId = data._id;

    var index = _.sortedIndex(RedAlert.messages, data, '_id');
    var remove = 0;

    // If the new record's time is within an older's threshold, delete older
    /*
    if (RedAlert.reduce
        && RedAlert.messages.length !== index
        && data.areas.equals(RedAlert.messages[index].areas)
        && (RedAlert.messages[index].time - data.time < RedAlert.reduce)) {
      remove = 1;
      for (var i=0; i < RedAlert.hooks.remove.length; i++)
        RedAlert.hooks.remove[i].call(this, RedAlert.messages[index]);
    }
    */
    // Only insert if last record was not in reduce threshold
    /*
    if (!RedAlert.reduce || index == 0 || !data.areas.equals(RedAlert.messages[index-1].areas)
        || data.time - RedAlert.messages[index-1].time > RedAlert.reduce) {
    */

      if (RedAlert.currentArea)
      for (var i=0; i < data.areas.length; i++) {
        if (data.areas[i] === RedAlert.currentArea.id) {
          data.inCurrentArea = true;
          break;
        }
      }

      RedAlert.messages.splice(index, remove, data);
      for (var i=0; i < RedAlert.hooks.msg.length; i++)
        RedAlert.hooks.msg[i].call(this, data);  
    //}

    RedAlert.saveData();
  }
}

// Figure out where we're hosted
var scriptSrc;
var scripts = document.getElementsByTagName("script");
// Guarenteed if loaded in HEAD
var scriptSrc = scripts[ scripts.length - 1 ].src;
if (!scriptSrc.match(/redalert.js/)) {
  // Loaded Asynchornously
  scripts = jQuery('script[async][src]');
  for (var i=0; i < scripts.length; i++)
    if (scripts[i].src.match(/redalert/)) {
      scriptSrc = scripts[i].src;
      break;
    }
}
scriptSrc = scriptSrc.match(/^(.*)\/redalert.js/)[1];

jQuery(document).ready(function() {
	RedAlert.iframe = $('<iframe>').css({display: 'none'});
	$('body').append(RedAlert.iframe);

  if (typeof localStorage === 'object') {
    var tmp;
    RedAlert.lastId = parseInt(localStorage.getItem('ra_lastId')) || 0;
    RedAlert.messages = JSON.parse(localStorage.getItem('ra_messages')) || [];
    RedAlert.areas.data = JSON.parse(localStorage.getItem('ra_areas'));
    RedAlert.locations.data = JSON.parse(localStorage.getItem('ra_locations'));
    tmp = JSON.parse(localStorage.getItem('ra_serials'));
    if (tmp) RedAlert.serials.stored = tmp;

    if (0 && RedAlert.reduce) {
      RedAlert.messages = RedAlert.messages.sort(idSort);
      for (var i=RedAlert.messages.length-1; i > 0; i--)
          if (RedAlert.messages[i].areas.equals(RedAlert.messages[i-1].areas)
          && RedAlert.messages[i].time - RedAlert.messages[i-1].time < RedAlert.reduce )
        RedAlert.messages.splice(i, 1);
      localStorage.setItem('ra_messages', JSON.stringify(RedAlert.messages));
    }
  }
  if (RedAlert.serials.stored.data === undefined ||
    RedAlert.serials.stored.data < RedAlert.serials.desired.data) {
    console.log('Removing cached data, need rev ' + RedAlert.serials.desired.data);
    localStorage.removeItem('ra_messages');
    localStorage.removeItem('ra_lastId');
    RedAlert.lastId = 0;
    RedAlert.messages = [];
    RedAlert.serials.stored.data = RedAlert.serials.desired.data;
    if (localStorage) {
      localStorage.setItem('ra_serials', JSON.stringify(RedAlert.serials.stored));
    }
  }
  if (RedAlert.serials.stored.areas < RedAlert.serials.desired.areas) {
    url = scriptSrc + '/areas.json?serial=' + RedAlert.serials.desired.areas;
    console.log('Fetching ' + url);
    jQuery.getJSON(url, function(data) {
      RedAlert.areas.data = data;
      RedAlert.serials.stored.areas = RedAlert.serials.desired.areas;
      if (localStorage) {
        localStorage.setItem('ra_serials', JSON.stringify(RedAlert.serials.stored));
        localStorage.setItem('ra_areas', JSON.stringify(RedAlert.areas.data));
      }
    });
  }
  if (RedAlert.serials.stored.locations < RedAlert.serials.desired.locations) {
    url = scriptSrc + '/locations.json?serial=' + RedAlert.serials.desired.locations;
    console.log('Fetching ' + url);
    jQuery.getJSON(url, function(data) {
      RedAlert.locations.data = data;
      RedAlert.serials.stored.locations = RedAlert.serials.desired.locations;
      if (localStorage) {
        localStorage.setItem('ra_serials', JSON.stringify(RedAlert.serials.stored));
        localStorage.setItem('ra_locations', JSON.stringify(RedAlert.locations.data));
      }
    });
  }

  if (RedAlert.initted)
    RedAlert.whenReady();
});

RedAlert.init = function() {
  RedAlert.initted = true;
  if (RedAlert.iframe)
    RedAlert.whenReady();
}

RedAlert.whenReady = function() {
  RedAlert.connect();

  // TODO: areas/locations loaded?
  for (var i=0; i < RedAlert.hooks.ready.length; i++)
    RedAlert.hooks.ready[i].call(this, status);      
}

window.setInterval(function() {
	if (RedAlert.status != 'connecting' && new Date() - RedAlert.lastMessage.receivedAt > 5000
		|| RedAlert.status == 'connecting' && new Date() - RedAlert.initConnect > 8000) {
		console.log('attempting reconnect...');
    RedAlert.iframe.src = '';
    window.setTimeout(function() {
      RedAlert.connect();
    }, 500);
	}
}, 1000);

RedAlert.updateCurrentArea = function() {
  var oldArea = RedAlert.currentArea;
  var newArea = RedAlert.areas.fromPos(RedAlert.currentPosition);
  if (!oldArea || oldArea !== newArea) {
    for (var i=0; i < RedAlert.hooks.newArea.length; i++)
      RedAlert.hooks.newArea[i].call(RedAlert, newArea, oldArea);
    RedAlert.currentArea = newArea;
  }
}

function geoWatch() {
  if (RedAlert.geoWatchId)
    navigator.geolocation.clearWatch(RedAlert.geoWatchId);

  RedAlert.geoWatchId = navigator.geolocation.watchPosition(
    function(pos) {
      var rpos = RedAlert.currentPosition;
      if (!rpos || !rpos.coords
          || rpos.coords.latitude !== pos.coords.latitude
          || rpos.coords.longitude !== pos.coords.longitude)

        RedAlert.currentPosition = pos;
        for (var i=0; i < RedAlert.hooks.position.length; i++)
          RedAlert.hooks.position[i].call(RedAlert, pos);

        RedAlert.updateCurrentArea();

    }, function(err) {
      console.log(err);
      geoWatch();
    }, {
      timeout: 3000
    });
}

// This works much better when the document is ready
var origOnLoad = window.onload;
window.onload = function() {
  if (origOnLoad)
    origOnLoad.apply(this.arguments);
  geoWatch();
}
