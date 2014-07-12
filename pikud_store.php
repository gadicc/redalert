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

	foreach($result->data as $alert) {
		preg_match('/^(.*) ([0-9]+)$/', $alert, $matches);
		$location = trim($matches[1]);
		$alert_id = intval($matches[2]);
//		echo "#$alert_id: $location\n";
		$SQL = 'INSERT IGNORE INTO pikud (pikud_id, time, location, response) VALUES (?, NOW(), ?, ?)';
		$dbh->query($SQL, array($alert_id, $location, $raw_result));
	}
}

echo $debug_out;
get_pikud();

?>
