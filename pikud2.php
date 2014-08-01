<?php

include('gadi_db.php');

$SQL = 'SELECT *,UNIX_TIMESTAMP(time) AS time FROM pikud2 ORDER BY id ASC';
$results = $dbh->getAll($SQL);

/*
$out = array();
foreach($results as $row) {
	$data = json_decode($row['response']);
	$areas = array();
	foreach($data->data as $el)
		foreach(split(",", $el) as $a) {
			preg_match('/ ([0-9]+)$/', $a, $match);
			$areas[] = intval($match[1]);
		}
	$out[] = array(
		"time" => intval($row['time']) * 1000,
		"pid" => $data->id,
		"areas" => $areas
	);		
} 

$out = json_encode($out);
echo $out;
*/

$out = "[\n";
$lastId = null;
foreach($results as $row) {
	$data = json_decode($row['response']);
	if ($data->id != $lastId) {
		$data->time = intval($row['time']) * 1000;
		$out .= json_encode($data) . ', ';
		$lastId = $data->id;
	}
}
$out = substr($out, 0, -2) . "\n]\n";

echo $out;
