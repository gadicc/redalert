// Gadi Cohen, nov12, GPLed.   v0.1
// See http://tzeva-adom.com/alerts.html

/* Usage:

var alerts = new Alerts("http://tzeva-adom.com:8080/redalert);
alerts.callback(function(data) { console.log(data); } );

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

Alerts.prototype.callback = function(callback) {
	this.callbacks.push(callback);
}

// jsonp long-poll (reverse ajax)
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

