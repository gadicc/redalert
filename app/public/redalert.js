RedAlert = {
	iframe: null,
  messages: [],
	lastMessage: { },
  lastId: 0,

	status: 'disconnected',
	setStatus: function(status) {
		RedAlert.status = status;
  	for (var i=0; i < RedAlert.hooks.status.length; i++)
  		RedAlert.hooks.status[i].call(this, status);  		
	},

	hooks: { msg: [], status: [] },

	connect: function() {
		console.log('RedAlert connecting...');
		var host = window.location.hostname;
  	var url = 'http://'+host+':8080/redalert?ts=' + new Date().getTime();
    if (RedAlert.lastId)
      url += '&lastId=' + RedAlert.lastId;
    RedAlert.iframe[0].src = url;
  	RedAlert.setStatus('connecting');
  	RedAlert.initConnect = new Date();
	},
	on: function(hook, func) {
		RedAlert.hooks[hook].push(func);
	}
};

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

RedAlert.saveData = debounce(function() {
  if (typeof localStorage === 'undefined')
    return;

  localStorage.setItem('ra_lastId', RedAlert.lastId);
  localStorage.setItem('ra_messages', JSON.stringify(RedAlert.messages));
});

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
    console.log(data);
    RedAlert.messages.push(data);
    RedAlert.saveData();
    if (data.id > RedAlert.lastId)
      RedAlert.lastId = data.id;
    //RedAlert.lastMessage.sentAt =     
  }

  for (var i=0; i < RedAlert.hooks.msg.length; i++)
    RedAlert.hooks.msg[i].call(this, data);
}

jQuery(document).ready(function() {
	RedAlert.iframe = $('<iframe>').css({display: 'none'});
	$('body').append(RedAlert.iframe);

  if (typeof localStorage === 'object') {
    RedAlert.lastId = parseInt(localStorage.getItem('ra_lastId'));
    RedAlert.messages = JSON.parse(localStorage.getItem('ra_messages'));
  }

	RedAlert.connect();
});

window.setInterval(function() {
	if (RedAlert.status != 'connecting' && new Date() - RedAlert.lastMessage.receivedAt > 5000
		|| RedAlert.status == 'connecting' && new Date() - RedAlert.initConnect > 5000) {
		console.log('attempting reconnect...');
		RedAlert.connect();
	}
}, 1000);  
