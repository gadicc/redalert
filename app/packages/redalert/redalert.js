redalert = {
  reactive: new ReactiveDict()
};

UI.registerHelper('redalert', {
  connected: function() {
    return redalert.reactive.get('status'); 
  },
  latency: function() {
    return redalert.reactive.get('latency');
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
    RedAlert.on('msg', function() {
      redalert.reactive.set('latency', RedAlert.lastMessage.latency);
    });
    RedAlert.on('status', function(status) {
      redalert.reactive.set('status', status);
    });

    Meteor.setInterval(function() {
      redalert.reactive.set('lastMsgDiff', RedAlert.lastMessage.receivedAt
        ? Math.round((new Date() - RedAlert.lastMessage.receivedAt) / 1000)
        : false);
    }, 1000);
  }
});
