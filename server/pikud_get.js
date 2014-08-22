var http = require('http');
var net = require('net');

var iconv = require('iconv-lite');
var request = require('request');
var Fiber = require('fibers');
var Server = require("mongo-sync").Server;

var debug = process.env.USER == 'dragon';
if (debug) {
	var MONGO_HOST = '127.0.0.1:4001';
} else {
	var MONGO_HOST = "188.226.253.94:6009";
	var MONGO_DB = "meteor";
	var MONGO_USER = "meteor";
	var MONGO_PASSWORD = "yGgCiKsc8o4jRj3Fw";
}

var RELAY_HOST = '127.0.0.1';
var RELAY_PORT = 8081;

var JSON_DUMP = './history.json';

var inc = function(i) {
  var fiber = Fiber.current;
  setTimeout(function() {
  	i++
    fiber.run(i);
  }, 1000);
  return Fiber.yield();
}

function pikud_get() {
	var fiber = Fiber.current;
	var start = new Date();
	request({
		uri: debug
			? 'http://www.oref.org.il/WarningMessages/alerts.json'
		  : 'http://friends.wastelands.net:5050/WarningMessages/alerts.json',
		headers: {
			host: "www.oref.org.il"
		},
		method: 'GET',
		encoding: 'binary',
		timeout: 1000,
	 }, function(err, res, body){
	 	if (err) {
	 		if (err.code == 'ETIMEDOUT') {
	 			console.log(new Date(), 'timeout');
	 			fiber.run({sleepTime: 0});
	 			return;
	 		} else {
		 		console.log(new Date());
		 		console.log('pikud get error');
		 		console.log(err);	 			
		 		fiber.run(null);
		 		return;
	 		}
	 	}
	 	if (res.statusCode == 403) {
	 		console.log(new Date(), "403 access denied :(");
	 		fiber.run(null);
	 		return;
	 	} else if (res.statusCode == 404) {	 		
	 		console.log(new Date(), "404 not found :(");
	 		fiber.run(null);
	 		return;
	 	} else if (res.statusCode != 200) {
	 		console.log(new Date());
	 		console.log('Unknown status code ' + res.statusCode);
	 		console.log(res.body);
	 		fiber.run(null);
	 		return;
	 	}
	 	var time = new Date() - start;
	 	var res;
	 	//console.log('request took ' + time + 'ms');
	  res = JSON.parse(iconv.decode(new Buffer(body, 'binary'), 'utf-16'));
	  res.sleepTime = 1000 - time;

	  if (res.sleepTime < 0)
	  	res.sleepTime = 0;

	  fiber.run(res);
	});
	return Fiber.yield();
}

/*
var data = { 
	"id" : "1406398660379",
	"title" : "פיקוד העורף התרעה במרחב ",
	"data" : []
};
*/

function processResponse(data) {
	var out = {
		time: data.time || new Date().getTime(),
		pid: parseInt(data.id),
		areas: []
	};
	for (var i=0; i < data.data.length; i++) {
		var multi = data.data[i].split(', ');
		for (var j=0; j < multi.length; j++) {
			var match = multi[j].match(/ ([0-9]+)$/);
			if (match) {
				var area = parseInt(match[1]);
				if (out.areas.indexOf(area) == -1)
					out.areas.push(area);
			}
			/*
			else
				console.log('nomatch',multi[j]);
				nomatch פיקוד העורף = תרגיל בדיקה
				nomatch בדיקה בדיקה
				nomatch פ-2
				nomatch פ-1
				nomatch פ-3
			*/
		}
	}
	return out;
}

function getNextSequence(name) {
   var ret = db.counters.findAndModify(
          {
            query: { _id: name },
            update: { $inc: { seq: 1 } },
            new: true,
            upsert: true
          }
   );
   return ret.seq;
}

function raInsert(doc) {
	doc._id = getNextSequence('redalert');
	db.redalert.insert(doc);
	return doc;
}

function sleep(ms) {
	if (!ms)
		return;

  var fiber = Fiber.current;
  setTimeout(function() {
      fiber.run();
  }, ms);
  Fiber.yield();
}

var sendToServer = function(data, fiber) {
	var str = data._id + ' alert ' + JSON.stringify(data);
	console.log(str);
	var client = net.connect({ host: RELAY_HOST, port: RELAY_PORT },
		function() {
			if (fiber)
				client.on('close', function() {
					fiber.run();
				})
			client.end(str + "\r\n");
		});
};

var sendHistory = function(data) {
	var client = net.connect({ host: RELAY_HOST, port: RELAY_PORT });
	var fiber = Fiber.current;
	client.on('data', function(data) { fiber.run(data); });
	var chunk = Fiber.yield();
	var lastId = parseInt(chunk.toString());

	if (lastId == 0) {
		for (var i=0; i < data.length; i++) {
			sendToServer(data[i], fiber);
			Fiber.yield();
		}
	}
};

var db;
Fiber(function() {
	var server = new Server(MONGO_HOST);
	db = server.db('meteor');
	if (typeof MONGO_USER !== 'undefined')
		db.auth(MONGO_USER, MONGO_PASSWORD);

	db.counters = db.getCollection('counters');
	db.redalert = db.getCollection('redalert');

	// Load historical data
	var data = db.redalert.find().sort({_id:1});
	if (data.count() == 0) {
		console.log("Database is empty, populating from " + JSON_DUMP);
		var history = require(JSON_DUMP);
		// probably not necessary but just in case
		history.sort(function(a,b) {
			return a.time-b.time;
		});
		data = [];
		for (var i=0; i < history.length; i++)
			data.push(raInsert(processResponse(history[i])));
	} else
		data = data.toArray();

	console.log(data.length + ' messages imported');

	// Upload historical data to server if needed
	sendHistory(data);

	// pikud_get loop
	var res, lastId, lastSuccess;
	while(1) {
		res = pikud_get();
		if (res) {
			lastSuccess = new Date();
			if (res.id && res.id !== lastId) {
				console.log('id change', lastId, res.id);
				lastId = res.id;
			}
			if (res.data && res.data.length) {
				console.log(res);
				var data = processResponse(res);
				console.log(data);
				raInsert(data);
				sendToServer(data);				
			}
		}
		sleep(res && res.sleepTime || 1000);
	}

	server.close();
}).run();

