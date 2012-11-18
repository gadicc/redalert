redalert
========

Hackathon related stuff, mostly Tzeva Adom related

Largely inspired by Michael Sverdlin's work at https://github.com/Sveder/red_color_map
Live on http://redalert.sveder.com/ and last 10 alerts at http://redalert.sveder.com/api/latest

What's happening here:

1) Better front-end for the data, including a dual-slider to filter the sirens, group multiple alerts together
2) Code to retrieve alert data from arutz2: isra-media.tk/2/ערוצים-מישראל/ערוץ-2-שידור-חי

Upcoming
========

1) DB of past warnings with API to retrieve them (see note below to use arutz2 code in the meantime)
2) Same kind of ideas that Michael Sverdlin lists on his page
3) Turn the whole thing into a PhoneGap app

Note
====

For the hackathon, you can use the arutz2 code to get new warnings, just run in a loop like in the arutz2.sh script.
If values['new_alert'] is present (see code), there's a new warning... that's how their web page knows to update
the page and play the siren.
