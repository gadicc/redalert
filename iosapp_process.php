<?php

include('gadi_db.php');
$source = 'iosapp';

$SQL = 'SELECT last_record FROM sources WHERE source_id=?';
$last_record = $dbh->getOne($SQL, 'iosapp');
if (!$last_record) $last_record = 0;

$SQL = 'SELECT * FROM iosapp WHERE id > ?';
$data = $dbh->getAll($SQL, $last_record);

function geolookup($q) {
	$q .= ', ישראל';
	$url = 'http://maps.google.com/maps/geo?q=' . urlencode($q);
	$data = file_get_contents($url);
	sleep(1);
	return json_decode($data);
}

$areas = array();
function area2id($area_name) {
	global $areas, $dbh;

	// process cache
	if (isset($areas[$area_name]))
		return $areas[$area_name];

	// already in DB
	$SQL = 'SELECT area_id FROM area WHERE area_name=? LIMIT 1';
	$area_id = $dbh->getOne($SQL, $area_name);
	if ($area_id) {
		$areas[$area_name] = $area_id;
		return $area_id;
	}

	// not in db, first find location data
	echo "Looking up for first-time: $area_name<br>";
	$geo = geolookup($area_name);
	if (isset($geo->Placemark[0]->Point->coordinates)) {
		$coords = ($geo->Placemark[0]->Point->coordinates);
		$long = $coords[0]; $lat = $coords[1];
	} else {
		$lat = 0; $long = 0;
	}

	$SQL = 'INSERT INTO area (area_name, area_lat, area_long) VALUES (?, ?, ?)';
	$dbh->query($SQL, array($area_name, $lat, $long));

	$SQL = 'SELECT LAST_INSERT_ID()';
	$area_id = $dbh->getOne($SQL);
	$areas[$area_name] = $area_id;
	return $area_id;
}

function store_alert($source, $source_id, $time, $location) {
	global $dbh;
	echo "$source $time $location<br>";
	$area_id = area2id($location);
	flush();

	$SQL = 'INSERT INTO alerts (time, area_id, source, source_id) VALUES (?, ?, ?, ?)';
	$dbh->query($SQL, array($time, $area_id, $source, $source_id));
}

foreach($data as $row) {
	$msg = $row['message'];
	$date = $row['date'];
	// 18/11/2012 - 17:47:12
	list($date, $month, $year, $hours, $minutes, $seconds)
		= sscanf($date, '%d/%d/%d - %d:%d:%d');
	$hours = $hours - 2;  // TZ correction
	$time = "$year-$month-$date $hours:$minutes:$seconds";

	if (substr($msg, 0, 15) == "צבע אדום") {
		$locations = explode(',', substr($msg, 16));
		foreach($locations as $location) {
			$location = trim($location);
			store_alert($source, $row['id'], $time, $location);
		}
	}
}

if ($data) {
	$last_record = $row['id'];
	$SQL = 'INSERT INTO sources (source_id, last_record) VALUES (?, ?) ON DUPLICATE KEY UPDATE last_record=VALUES(last_record)';
	$dbh->query($SQL, array($source, $last_record));
}

echo $debug_out;
?>
