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
  }
};

UI.registerHelper('redalert', {
  connected: function() {
    return redalert.reactive.get('status'); 
  },
  latency: function() {
    return redalert.reactive.get('latency');
  },
  area: function() {
  	return redalert.reactive.get('area');
  }
});

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
      if (typeof msg !== 'number')
      	if (!msg.reduced)
		    	redalert.messages.insert(redalert.msgToDoc(msg));
    });

    RedAlert.on('remove', function(msg) {
    	redalert.messages.remove(msg._id.toString());
    });

    RedAlert.on('status', function(status) {
      redalert.reactive.set('status', status);
    });

    RedAlert.on('ready', function() {
    	for (var i=0; i < RedAlert.messages.length; i++) {
    		redalert.messages.insert(redalert.msgToDoc(RedAlert.messages[i]));
    	}

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

					var newArea = RedAlert.areaFromPos(pos);
					var oldArea = redalert.reactive.get('area');
					if (!oldArea || oldArea.id != newArea.id) {
						redalert.reactive.set('area', newArea);
						console.log(newArea);
					}
				});
			});
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


function checkLocation() {
	if (navigator.geolocation) {
 	 	navigator.geolocation.getCurrentPosition(function(pos) {
 	 		var rpos = redalert.reactive.get('position');
 	 		if (!rpos || !rpos.coords
	 	 			|| rpos.coords.latitude !== pos.coords.latitude
 		 			|| rpos.coords.longitude !== pos.coords.longitude)
 	 			redalert.reactive.set('position', pos);
 	 		Meteor.setTimeout(checkLocation, 5000);
 	 	}, function(err) {
 	 		console.log(err);
 	 	});
 	}
}
checkLocation();
