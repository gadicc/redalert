Router.map(function() {
	this.route('settings');
});

Template.settings.events({

	'click #clearCache': function(event, tpl) {
		RedAlert.resetStorage();
		window.location.reload();
	}

});
