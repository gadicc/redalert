mfPkg.init('en');

mfPkg.webUI.allowFuncs = [ function() { return true; } ];
if (Meteor.isClient) {
	Meteor.userId = Meteor.user = function() { return true; }
}