<?php

include('gadi_db.php');

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : null;
$lastId = isset($_GET['lastId']) ? intval($_GET['lastId']) : 0;

// BOO :(   Get last 10 alerts
if ($limit) {
	$SQL = 'SELECT MIN(alert_id) AS alert_ids
		FROM alerts GROUP BY time
		ORDER BY time DESC LIMIT 10,1';
	$lastId = $dbh->getCol($SQL);
}

$SQL = 'SELECT alert_id,area_lat,area_long,area_name,
		UNIX_TIMESTAMP(time) AS time
	FROM alerts INNER JOIN area USING (area_id)
	WHERE alert_id > ?
	ORDER BY time DESC';
$data1 = $dbh->getAll($SQL, array($lastId));

if ($data1) {
	foreach($data1 as $row1) {
		$row['alert_id'] = intval($row1['alert_id']);
		$row['area_name'] = $row1['area_name'];
		$row['time'] = intval($row1['time']);
		$row['area_lat'] = floatval($row1['area_lat']);
		$row['area_long'] = floatval($row1['area_long']);
		$data[] = $row;
	}
	echo json_encode($data);
} else {
	echo '[]';
}
