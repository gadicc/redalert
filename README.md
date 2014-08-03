## RedAlert / tzeva-adom.com

This is an open source project with various parts:

* RedAlert Server.  Custom coded server software to constantly push updates
  down to a large numbes of simultaneous users, hopefully 100,000 per server
  instance.  Also includes a scraper for the pikud haoref feed.

* RedAlert client.  A JS library to connect and keep connected to the server,
  provides callbacks for various events, and mappings of areas, locations,
  geodata and other info.

* Meteor smart package.  A wrapper around the client to make things reactive
  and comfortable to use in Meteor.

* RedAlert app.  A meteor app demonstrating how the library can be used, built
  for mobile first, that shows realtime and past alerts for the current area
  and entire country, with frequency charts and map points.  If an alert is
  received for the current area, a siren will be sounded, a timer begins with
  the time to cover, and walking directions are given to the nearest shelter
  (WIP).

* Data.  Data we've found from various sourcs and code to augment this data
  in various ways, including geodata and calculations using the geodata.  It
  is a community effort and should not be considered an authorative source.