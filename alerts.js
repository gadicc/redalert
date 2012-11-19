// Gadi Cohen, nov12, GPLed.   v0.1
// See http://tzeva-adom.com/alerts.html

/* Usage:

var alerts = new Alerts();
alerts.callback(function(data) { console.log(data); } );

*/

function Alerts(lastId) {
	this.timeout = 0;
	this.callbacks = [];
	this.lastId = 0;
	this.sleepTime = 1000;
}

Alerts.prototype.getAfter = function(lastId) {
	var _this = this;
	if (lastId) this.lastId = lastId;

	$.ajax({
		url: 'alerts.php?lastId=' + this.lastId,
		dataType: 'json',
		success: function(data) {
			if (data.length > 0) {
				_this.lastId = _this.findMaxId(data);
				for (var i=0; i < _this.callbacks.length; i++)
					_this.callbacks[i](data);
			}
			_this.timeout = setTimeout(function() { _this.getAfter(); }, _this.sleepTime);
		}
	});
}

Alerts.prototype.findMaxId = function(data) {
	var max_id = 0;
	for (var i=0; i < data.length; i++)
		if (data[i].alert_id > max_id)
			max_id = data[i].alert_id;
	return max_id;
}

Alerts.prototype.callback = function(callback) {
	this.callbacks.push(callback);
}

