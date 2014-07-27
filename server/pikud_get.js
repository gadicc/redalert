var http = require('http');
var net = require('net');

var iconv = require('iconv-lite');
var request = require('request');
var Fiber = require('fibers');
var Server = require("mongo-sync").Server;

var MONGO_HOST = '127.0.0.1:3001';
var RELAY_HOST = '127.0.0.1';
var RELAY_PORT = 8081;

var JSON_DUMP = './history.json';

/*
var MongoClient = require('mongodb').MongoClient;
var MONGO_URL="mongodb://127.0.0.1:3001/meteor";
*/

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
	request({
		uri: 'http://www.oref.org.il/WarningMessages/alerts.json',
		method: 'GET',
		encoding: 'binary'
	 }, function(err, resp, body){
	  body = iconv.decode(new Buffer(body, 'binary'), 'utf-16');
	  fiber.run(JSON.parse(body));
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

function process(data) {
	var out = {
		time: data.time || new Date().getTime(),
		pid: parseInt(data.id),
		areas: []
	};
	for (var i=0; i < data.data.length; i++) {
		var multi = data.data[i].split(', ');
		for (var j=0; j < multi.length; j++) {
			var match = multi[j].match(/ ([0-9]+)$/);
			if (match)
				out.areas.push(parseInt(match[1]));
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
			console.log(i);
			sendToServer(data[i], fiber);
			Fiber.yield();
		}
	}
};

var db;
Fiber(function() {
	var server = new Server(MONGO_HOST);
	db = server.db('meteor');

	db.counters = db.getCollection('counters');
	db.redalert = db.getCollection('redalert');

	// Load historical data
	var data = db.redalert.find();
	if (data.count() == 0) {
		console.log("Database is empty, populating from " + JSON_DUMP);
		data = require(JSON_DUMP);
		for (var i=0; i < data.length; i++)
			raInsert(process(data[i]));
	} else
		data = data.toArray();
	console.log(data.length + ' messages imported');

	// Upload historical data to server if needed
	sendHistory(data);

	// pikud_get loop
	var res;
	while(1) {
		res = pikud_get();
		if (res.data.length) {
			console.log(res);
			var data = process(res);
			console.log(data);
			raInsert(data);
			sendToServer(data);
		}
		sleep(1000);
	}

	server.close();
}).run();

