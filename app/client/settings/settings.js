Router.map(function() {
	this.route('settings');
});

Template.settings.events({

	'click #clearCache': function(event, tpl) {
		RedAlert.resetStorage();
		window.location.reload();
	},
	'click button.changeLang': function(event, tpl) {
		var lang = $(event.target).attr('data-lang');
		Session.set('locale', lang);
		Session.set('lang', lang);
	}

});
