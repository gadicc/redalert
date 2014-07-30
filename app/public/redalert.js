RedAlert = {
  host: 'api1.tzeva-adom.com',
  initted: false,
  reduce: 15000,

	iframe: null,
  messages: [],
  areas: { data: {} },
  locations: { data: {} },
  serials: {
    desired: { areas: 4, locations: 4 },
    stored: { areas: 0, locations: 0 }
  },
	lastMessage: { },
  lastId: 0,

	status: 'disconnected',
	setStatus: function(status) {
		RedAlert.status = status;
  	for (var i=0; i < RedAlert.hooks.status.length; i++)
  		RedAlert.hooks.status[i].call(this, status);  		
	},

	hooks: { msg: [], status: [], ready: [], remove: [] },

	connect: function() {
		console.log('RedAlert connecting...');
		//var host = window.location.hostname;
  	var url = 'http://'+RedAlert.host+':8080/redalert?ts=' + new Date().getTime();
    if (RedAlert.lastId)
      url += '&lastId=' + RedAlert.lastId;
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
RedAlert.areas.fromPos = function(pos) {
  var area, bounds, distance, shortest, shortestId = null;
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
    if (RedAlert.reduce
        && RedAlert.messages.length !== index
        && data.areas.equals(RedAlert.messages[index].areas)
        && (RedAlert.messages[index].time - data.time < RedAlert.reduce)) {
      remove = 1;
      for (var i=0; i < RedAlert.hooks.remove.length; i++)
        RedAlert.hooks.remove[i].call(this, RedAlert.messages[index]);
    }
    // Only insert if last record was not in reduce threshold
    if (!RedAlert.reduce || index == 0 || !data.areas.equals(RedAlert.messages[index-1].areas)
        || data.time - RedAlert.messages[index-1].time > RedAlert.reduce) {
      RedAlert.messages.splice(index, remove, data);
      for (var i=0; i < RedAlert.hooks.msg.length; i++)
        RedAlert.hooks.msg[i].call(this, data);  
    }

    RedAlert.saveData();
  }
}

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
  if (RedAlert.serials.stored.areas < RedAlert.serials.desired.areas) {
    url = '/areas.json?serial=' + RedAlert.serials.desired.areas;
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
    url = '/locations.json?serial=' + RedAlert.serials.desired.locations;
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
