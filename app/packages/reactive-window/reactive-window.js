rwindow = new ReactiveDict();

rwindow.set('width', $(window).width());

var update = function() {
	rwindow.set('innerWidth', window.innerWidth);
	rwindow.set('outerWidth', window.outerWidth);
	rwindow.set('$width', $(window).width());
	rwindow.set('innerHeight', window.innerHeight);
	rwindow.set('outerHeight', window.outerHeight);
	rwindow.set('$height', $(window).height());
}

var origOnResize = window.onresize;
window.onresize = function() {
	if (origOnResize)
		origOnResize.apply(this, arguments);
	update();
}

Meteor.setInterval(function() {
	// detect if scrollbar added
	update();
}, 100);
