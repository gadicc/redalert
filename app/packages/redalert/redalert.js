redalert = {
  reactive: new ReactiveDict(),
  messages: new Meteor.Collection(null),
  msgToDoc: function(msg) {
		return {
			_id: msg._id.toString(),
			createdAt: new Date(msg.time),
			type: msg.type || 'alert',
			areas: msg.areas
		}
  },
  observes: [],
  queries: []
};

UI.registerHelper('redalert', {
  connected: function() {
    return redalert.reactive.get('status'); 
  },
  latency: function() {
    return redalert.reactive.get('latency');
  },
  lastMsgDiff: function() {
  	return redalert.reactive.get('lastMsgDiff');
  },
  area: function() {
  	return redalert.reactive.get('area');
  }
});

var Cursor = function(query, options) {
	if (!query) query = {};
	this.query = query;
	if (!options) options = {};
	this.options = options;

  // by default, queries register w/ Deps when it is available.
  if (typeof Deps !== "undefined")
    this.reactive = (options.reactive === undefined) ? true : options.reactive;
};
redalert.find = function(query, options) {
	return new Cursor(query, options);
};
redalert.findOne = function(query, options) {
	if (!options) options = {};
	if (!options.limit) options.limit = 1;
	var cursor = new Cursor(query, options);
	return cursor.fetch()[0];
};
Cursor.prototype.fetch = function() {
	var self = this;
	if (Deps.active) {
		var v = new Deps.Dependency;
		v.depend();
		var notifyChange = _.bind(v.changed, v);
	}

	// observe will stop() when this computation is invalidated
	self.observe({
		added: function() {
			// console.log('notifyChange');
			notifyChange();
		},
		invalidate: function() {
			notifyChange();
		}
	}, {
		_suppress_initial: true
	});

	return typeof RedAlert == 'object'
		? RedAlert.find(this.query, this.options)
		: [];
};

// Note, mongo observe handles options via additional function
Cursor.prototype.observe = function(callbacks, options) {
	var self = this;

	var observeRecord = _.extend({query: self.query}, callbacks);
	redalert.observes.push(observeRecord);

	var data = typeof RedAlert !== 'undefined'
		? RedAlert.find(self.query, self.options) // non reactive
		: [];
 	observeRecord.data = data;

	if (!options || !options._suppress_initial)
	for (var i=0; i < data.length; i++) {
		callbacks.addedAt && callbacks.addedAt(data[i], i, null);
		callbacks.added && callbacks.added(data[i]);
	}

	var handle = {
		_fetch: function () {
			// needed in 0.8.3 but removed in devel
			// so lets forego the attempt at a snapshot
			return data;
    },
 		stop: function() {
// 			console.log('stopped', observeRecord.query);
 			redalert.observes = _.reject(redalert.observes, function(obs) {
 				return obs === observeRecord;
 			});
		}
	};

	if (self.reactive && Deps.active) {
//		console.log('setup inval', observeRecord.query);
		Deps.onInvalidate(function() {
//			console.log('invalid', observeRecord.query);
			handle.stop();
		});
	}

	return handle;
}

jQuery.ajax({
  crossDomain: true,
  dataType: 'script',
  url: '/redalert.js',
  error: function() {
    console.log('fail', this, arguments);
  },
  success: function() {
    RedAlert.on('msg', function(msg) {
      redalert.reactive.set('latency', RedAlert.lastMessage.latency);
      if (typeof msg !== 'number')  // ping
      	if (!msg.reduced) {
      		// redalert.messages.insert(redalert.msgToDoc(msg));
      		for (var obs, i=0; i < redalert.observes.length; i++) {
      			obs = redalert.observes[i];
      			if (obs.query.time) {
      				if (obs.query.time.$gt && msg.time < obs.query.time.$gt
      				 || obs.query.time.$lt && msg.time > obs.query.time.$lt)
      						continue;
      			}
    				if (obs.query.areas && !_.contains(msg.areas, obs.query.areas))
    					continue;
    				if (1) { // if reverse sorted
    					obs.addedAt && obs.addedAt(msg, 0, obs.data[0]._id);
    					obs.added && obs.added(msg);
    				}
      		}
      	}
    });

    RedAlert.on('remove', function(msg) {
    	redalert.messages.remove(msg._id.toString());
    });

    RedAlert.on('status', function(status) {
      redalert.reactive.set('status', status);
    });

    RedAlert.on('ready', function() {
    	/*
    	for (var i=0; i < RedAlert.messages.length; i++) {
    		redalert.messages.insert(redalert.msgToDoc(RedAlert.messages[i]));
    	}
    	*/

			redalert.reactive.set('position', null);
			RedAlert.on('ready', function() {
				Deps.autorun(function() {
					var pos = redalert.reactive.get('position');
					if (pos)
						pos = {
							lat: pos.coords.latitude,
							lng: pos.coords.longitude
						};
					else
						return;

					var newArea = RedAlert.areas.fromPos(pos);
					var oldArea = redalert.reactive.get('area');
					if (!oldArea || oldArea.id != newArea.id) {
						redalert.reactive.set('area', newArea);
						console.log('newArea', newArea);
					}
				});
			});

  		for (var obs, i=0; i < redalert.observes.length; i++) {
  			obs = redalert.observes[i];
  			obs.invalidate && obs.invalidate();
  		}

    });

    RedAlert.init();

    Meteor.setInterval(function() {
      redalert.reactive.set('lastMsgDiff', RedAlert.lastMessage.receivedAt
        ? Math.round((new Date() - RedAlert.lastMessage.receivedAt) / 1000)
        : false);
    }, 1000);
  }
});

var lastInsert = new Date();
redalert.reactive.set('ready', false);
function checkReady() {
	if (new Date() - lastInsert > 1000)
		redalert.reactive.set('ready', true);
	else
		Meteor.setTimeout(checkReady, 1000);
};
checkReady();

Deps.autorun(function() {
	var count = redalert.messages.find().count();
	lastInsert = new Date();
});

function geoWatch() {
	if (redalert.geoWatchId)
		navigator.geolocation.clearWatch(redalert.geoWatchId);

	redalert.geoWatchId = navigator.geolocation.watchPosition(
		function(pos) {
	 		var rpos = redalert.reactive.get('position');
			if (!rpos || !rpos.coords
		 			|| rpos.coords.latitude !== pos.coords.latitude
		 			|| rpos.coords.longitude !== pos.coords.longitude)
	 			redalert.reactive.set('position', pos);
		}, function(err) {
			console.log(err);
			geoWatch();
		}, {
			timeout: 3000
		});
	Meteor.setTimeout(function() {
		if (!redalert.reactive.get('position'))
			geoWatch();
	}, 4000);
}

// This works much better when the document is ready
if (navigator.geolocation)
	$(document).ready(geoWatch);
