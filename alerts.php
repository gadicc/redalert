<?php

include('gadi_db.php');

$limit = isset($_GET['limit']) ? intval($_GET['limit']) : null;
$lastId = isset($_GET['lastId']) ? intval($_GET['lastId']) : 0;
$source = isset($_GET['source']) ? explode(",",$_GET['source']) : null;
$fmt = isset($_GET['fmt']) ? $_GET['fmt'] : 'json';

// BOO :(   Get last 10 alerts
if ($limit) {
	$SQL = 'SELECT MAX(alert_id) AS alert_ids
		FROM alerts';
		if ($source)
			$SQL .= ' WHERE source IN ("'.implode('","', $source).'")';
	$SQL .=	'GROUP BY time
		ORDER BY alert_id DESC LIMIT '.$limit.',1';
	$lastId = $dbh->getOne($SQL);
}

$SQL = 'SELECT alert_id,area_lat,area_long,area_name,
		UNIX_TIMESTAMP(time) AS time
	FROM alerts INNER JOIN area USING (area_id)
	WHERE alert_id > ?';
if ($source)
	$SQL .= ' AND source IN ("'.implode('","', $source).'")';
$SQL .=	' ORDER BY time DESC';
$data = $dbh->getAll($SQL, array($lastId));

function correctTypes($data) {
	foreach($data as $row1) {
		$row['alert_id'] = intval($row1['alert_id']);
		$row['area_name'] = $row1['area_name'];
		$row['time'] = intval($row1['time']);
		$row['area_lat'] = floatval($row1['area_lat']);
		$row['area_long'] = floatval($row1['area_long']);
		$typedData[] = $row;
	}
	return $typedData;
}

function htmlpage($inside) {
	return '
<html>

<head>
<title>Tzeva-Adom.Com Feed</title>
</head>

<body>
'.$inside.'
</body>
</html>';
}

function htmlize($data) {
	$out = '';
	foreach($data as $row) {
		$out .= date('j.m H:i', $row['time']).' '.$row['area_name'].'<br>'."\n";
	}
	return $out;
}

if ($data) {
	if ($fmt == "json")
		echo json_encode(correctTypes($data));
	elseif ($fmt == "html")
		echo htmlpage(htmlize($data));	
} else {
	if ($fmt == "json")
		echo '[]';
	elseif ($fmt == "html")
		echo htmlpage("<p>No updates</p>");
}
