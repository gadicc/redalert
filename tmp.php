<?php

include('gadi_db.php');

$SQL = 'SELECT area_name FROM area WHERE area_json=""';
$areas = $dbh->getCol($SQL);

function geolookup($q) {
	$q .= ', ישראל';
	$url = 'http://maps.google.com/maps/geo?q=' . urlencode($q);
	$data = file_get_contents($url);
	sleep(1);
	return json_decode($data);
}

foreach($areas as $area) {
	$json = geolookup($area);
	$SQL = 'UPDATE area SET area_json=? WHERE area_name=?';
	$dbh->query($SQL, array(json_encode($json), $area));
}

	
