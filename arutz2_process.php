<?php

include('gadi_db.php');
include('Source.php');

$source = new Source('arutz2', 'arutz2_id');
$data = $source->getRows();
date_default_timezone_set('Asia/Jerusalem');

foreach($data as $row) {
	$orig_time = $row['orig_time'];
	$lastcheck = $row['lastcheck'];
	$location = $row['location'];

	// convert arutz2 time to unix timestamp (and correct TZ)
	// "hayom" in hebrew is 8 chars (unicode)
	if (substr($orig_time, 0, 8) == "היום") {
		$time = substr($orig_time, 9);
		$time = mktime(substr($time, 0, 2), substr($time, 3), 0,
				date('n', $lastcheck), date('j', $lastcheck), date('Y', $lastcheck));
	} else {
		echo __FILE__.':'.__LINE__.' - Go add support for timing of: "' . $orig_time . '"<br />';
	}
	
	$location = preg_replace('/מ\.א[\.]{0,1}/', 'מועצה אזורית', $location);
	$location = preg_replace('/, /', ' ו', $location);

	// these will only work until we have a city name startin with vav ("ו") or bet ("ב")
	$locations = explode(' ו', $location);
	foreach($locations as $location) {
		$location = preg_replace('/^ב/', '', $location);
		$location = trim($location);
		$source->alertStore($row['arutz2_id'], $time, $location);
	}
}

if ($data)
	$source->setLastRecordId($row['arutz2_id']);

echo $debug_out;
?>
