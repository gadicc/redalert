<?php

include('gadi_db.php');

$SQL = 'SELECT alert_id,area_lat,area_long,area_name,
		UNIX_TIMESTAMP(time) AS time
	FROM alerts INNER JOIN area USING (area_id)';
$data1 = $dbh->getAll($SQL);

foreach($data1 as $row1) {
	$row['alert_id'] = intval($row1['alert_id']);
	$row['area_name'] = $row1['area_name'];
	$row['time'] = intval($row1['time']);
	$row['area_lat'] = floatval($row1['area_lat']);
	$row['area_long'] = floatval($row1['area_long']);
	$data[] = $row;
}

echo json_encode($data);

