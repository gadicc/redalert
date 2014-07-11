<?php

include('gadi_db.php');
include('Source.php');

$source = new Source('pikud', 'pikud_id');
$data = $source->getRows(null, true);
date_default_timezone_set('Asia/Jerusalem');

$max_id = 0;
foreach($data as $row) {
	if ($row['pikud_id'] > $max_id)
		$max_id = $row['pikud_id'];
	$source->alertStore($row['pikud_id'], $row['time'], $row['location']);
}

if ($max_id > 0) {
	$source->setLastRecordId($max_id);
}

echo $debug_out;
?>
