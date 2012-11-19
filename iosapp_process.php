<?php

include('gadi_db.php');
include('Source.php');

$source = new Source('iosapp');
$data = $source->getRows();
date_default_timezone_set('Asia/Jerusalem');

foreach($data as $row) {
	$msg = $row['message'];
	$date = $row['date'];  // 18/11/2012 - 17:47:12
	list($date, $month, $year, $hours, $minutes, $seconds) = sscanf($date, '%d/%d/%d - %d:%d:%d');
	$time = mktime($hours, $minutes, 0, $month, $date, $year);

	if (substr($msg, 0, 15) == "צבע אדום") {
		$locations = explode(',', substr($msg, 16));
		foreach($locations as $location) {
			$location = trim($location);
			$source->alertStore($row['id'], $time, $location);
		}
	}
}

if ($data)
	$source->setLastRecordId($row['id']);

echo $debug_out;
?>
