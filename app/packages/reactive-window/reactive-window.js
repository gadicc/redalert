rwindow = new ReactiveDict();

/*
Session.set('windowWidth', $(window).width());
$(document).ready(function() {
	Deps.autorun(function() {
		var IDEAL_WIDTH = 200;
		var sheet = document.getElementById('picStyle').sheet;
		var windowWidth = Session.get('windowWidth');
		var cols = Math.round(windowWidth / IDEAL_WIDTH);
		var width = (windowWidth / cols) - 0.1;
		var height = width * 0.75;

		if (!Session.get('picsLimit'))
			Session.set('picsLimit', cols * PICS_INIT_ROWS);

		if (sheet.rules && sheet.rules.length)
				sheet.deleteRule(0);
		sheet.insertRule('div.pic { width: ' + width + 'px; height: ' + height + 'px;', 0);
	});
});
window.onresize = function() {
	Session.set('windowWidth', $(window).width());
}

Meteor.setInterval(function() {
	// detect if scrollbar added
	var width = $(window).width();
	if (Session.get('modalData'))
		return;
	if (Session.get('windowWidth') !== width)
		Session.set('windowWidth', width);
}, 100);
*/