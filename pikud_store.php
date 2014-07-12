<?php

include('gadi_db.php');
date_default_timezone_set('Asia/Jerusalem');

/*
��{ 
"id" : "1405080018742",
"title" : "����� ����� ����� ����� ",
"data" : []
}
*/

function get_pikud_req() {
	$url = 'http://www.oref.org.il/WarningMessages/alerts.json';

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); 
	$result = curl_exec($ch);
	curl_close($ch);

	$result = mb_convert_encoding($result, 'UTF-8', 'UTF-16');
	return $result;
}

// $result = file_get_contents('alerts_empty.json');
$result = file_get_contents('alerts_example.json');
// $result = mb_convert_encoding($result, 'UTF-8', 'UTF-16');
//$result = get_pikud_req();

function get_pikud() {
	global $dbh;

	$raw_result = $GLOBALS['result'];
	//$raw_result = get_pikud_req();
	$result = json_decode($raw_result);
//var_dump($result);

	if (sizeof($result->data) > 0) {
		$max_id = $dbh->getOne('SELECT MAX(pikud2_id) FROM pikud2');
		if (!$max_id) $max_id = 0;
		if ($result->id <= $max_id)
			return;

		echo "$raw_result\n";
		$SQL = 'INSERT INTO pikud2 (pikud2_id, time, response) VALUES (?, NOW(), ?)';
		$dbh->query($SQL, array($result->id, $raw_result));	
	}

	$loc_cache = array();
	foreach($result->data as $alerts_str) {
		$alerts = split(',', $alerts_str);
		foreach($alerts as $alert) {
			$alert = trim($alert);
			preg_match('/^(.*) ([0-9]+)$/', $alert, $matches);
			$location = trim($matches[1]);
			$alert_id = intval($matches[2]);
			echo "#$alert_id: $location\n";

			// avoid dupes in same response
			if (!in_array($location, $loc_cache)) {
				$loc_cache[] = $location;
				$SQL = 'INSERT IGNORE INTO pikud (time, location, pikud_data_id) VALUES (NOW(), ?, ?)';
				$dbh->query($SQL, array($location, $result->id));
			}
		}
	}
}

echo $debug_out;
get_pikud();

?>
