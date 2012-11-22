// Gadi Cohen, nov12, GPLed.   v0.1
// See http://tzeva-adom.com/alerts.html

/* Usage:

var alerts = new Alerts("http://tzeva-adom.com:8080/redalert);
alerts.callback(function(data) { console.log(data); } );
alerts.poll();

*/


/**
  * Alerts class constructor.  Initiates a new Alerts object, which handles
  * JSONP long polling to the server (see below).
  * @constructor
  *
  * @param url    Defaults to http://currenthost:8080/redalert
  * <br>          You'll want http://tzeva-adom.com:8080/redalert on external code
  *
  * @return Alerts object
  */
function Alerts(url) {
	this.timeout = 0;
	this.callbacks = [];
	this.sleeptime = 1000;
	if (!url) url = "http://" + window.location.host + ":8080/redalert";
	this.url = url;
	this.lastSuccess = null;
	this.failureCount = 0;
}

/**
  * Specify a callback function to be called whenever there is new data
  * from the server.  The function will be called with the new data as it's
  * only argument.  You may add as many callback functions as required.
  *
  * @param callback   - function reference or anonymous function
  *
  */
Alerts.prototype.callback = function(callback) {
	this.callbacks.push(callback);
}

/**
  * Performs a JSONP "long poll" (a "reverse ajax" technique)
  * This is the main code that interacts with the server to retrieve new information.  With long polling,
  * the XHR request is blocked on the server side (and kept open on the client) until there is new data to
  * send.  It sends the data, closes the connection, and initiates a new connection to wait for data again.
  * JSONP is used to allow for cross-domain requests.
  */
Alerts.prototype.poll = function() { 
	var _this = this;
	$.ajax({
		url: this.url,
		dataType: 'jsonp',
		jsonpCallback: 'redalert',
		success: function(data) {
			_this.lastSuccess = new Date();
                        for (var i=0; i < _this.callbacks.length; i++)
                        	_this.callbacks[i](jQuery.parseJSON(data));
			_this.poll();
		},
		error: function(jqXHR, textStatus, errorThrown) {
			_this.failureCount++;
			console.log('Error: ' + textStatus + ' ' + errorThrown + ', sleeping...');
			_this.timeout = setTimeout(function() { _this.poll(); }, _this.sleeptime);
		}
	});
} 

