Router.map(function() {
	this.route('settings');
});

Template.settings.events({

	'click #clearCache': function(event, tpl) {
		RedAlert.resetStorage();
		window.location.reload();
	},
	'change [name=lang]': function(event, tpl) {
		var lang = event.target.value;
		Session.set('locale', lang);
		Session.set('lang', lang);
	}

});

Template.settings.helpers({
	'langs': function() {
		return [
			{ key: 'en', value: 'English' },
			{ key: 'he', value: 'עברית'}
		];
	},
	'isCurrentLang': function(lang) {
		return Session.get('lang') == lang;
	}
});
