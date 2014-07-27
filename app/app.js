if (Meteor.isClient) {
  Template.hello.greeting = function () {
    return "Welcome to app.";
  };

  Template.hello.events({
    'click input': function () {
      // template data, if any, is available in 'this'
      if (typeof console !== 'undefined')
        console.log("You pressed the button");
    }
  });


  /*
  RedAlert.on('msg', function() {
  	if (Math.round(RedAlert.lastMessage.receivedAt/1000)%5 == 0)
	  	$('body').append($('<div>').html(new Date(RedAlert.lastMessage.receivedAt)));
  });
  */
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
