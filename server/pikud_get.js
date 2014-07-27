var http = require('http');
var net = require('net');

var iconv = require('iconv-lite');
var request = require('request');
var Fiber = require('fibers');
var Server = require("mongo-sync").Server;

var MONGO_HOST = '127.0.0.1:3001';
var RELAY_HOST = '127.0.0.1';
var RELAY_PORT = 3333;

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

var sendToServer = function(data) {
	var str = data._id + ' alert ' + JSON.stringify(data);
	var client = net.connect({ host: RELAY_HOST, port: RELAY_PORT },
		function() {
			client.end(str + "\n");
		});
};

var db;
Fiber(function() {
	var server = new Server(MONGO_HOST);
	db = server.db('meteor');

	db.counters = db.getCollection('counters');
	db.redalert = db.getCollection('redalert');

	// Import old data
	/*
	var data = require('./x.json');
	for (var i=0; i < data.length; i++)
		raInsert(process(data[i]));
	*/

	/*
	var res;
	while(1) {
		res = pikud_get();
		if (res.data.length) {
			console.log(res);
			var data = process(res);
			console.log(data);
			raInsert(data);
		} else console.log('no data');
		sleep(1000);
	}
	*/

	var data = require('./x.json');
	sendToServer(raInsert(process(data[0])));

	server.close();
}).run();

