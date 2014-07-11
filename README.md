# redalert

This project has two parts:

## Part 1: Tzeva Adom API for other developers

* Aggregates various data sources (since 2014-07-11, just from pikud ha'oref)
* Provides a JS library that calls a callback on each new alert (via long
polling, aka reverse ajax).  Location data and bounds checking ("am I in
range?") is included.
* Includes it's own custom built server which should handle over 100,000
simultaneous connections (untested; but this is the reason we didn't go for
a pub/sub system).  The server is freely accessible by other devs for use
in their projects.

See:

* [Documentation for JS API](http://tzeva-adom.com/docs/)
* [JSON feed](http://tzeva-adom.com/alerts.html) for manual parsing/scraping
* [Create a test alert](http://tzeva-adom.com/test.php) to test your code

## Part 2: Visualization of Alerts with Google Maps

* Show alerts on the map.  Sound tzeva adom recording if you're in range.
* Dual-slider to choose start-end range of alerts, for visualization purposes

## Credits

* Largely inspired by Michael Sverdlin's work at https://github.com/Sveder/red_color_map, live on http://redalert.sveder.com/ and last 10 alerts at http://redalert.sveder.com/api/latest.

* 2012 Hackathon team
