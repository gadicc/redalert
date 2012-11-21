<?php

include('gadi_db.php');
set_time_limit(0);

function redalert_send($data) {
	$address = "localhost";
	$port = 8081;

	/* Create a TCP/IP socket. */
	$socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
	if ($socket === false) {
	    echo "socket_create() failed: reason: " . socket_strerror(socket_last_error()) . "\n";
	    exit;
	} else {
	//    echo "OK.\n";
	}

	echo "Connecting to '$address' on port '$port'...";
	$result = socket_connect($socket, $address, $port);
	if ($result === false) {
	    echo "socket_connect() failed.\nReason: ($result) " . socket_strerror(socket_last_error($socket)) . "\n";
	} else {
	    echo "OK.\n";
	}

	/*
	Connection:Keep-Alive
	Content-Encoding:gzip
	Content-Length:22
	Content-Type:text/html
	Date:Wed, 21 Nov 2012 19:11:27 GMT
	Keep-Alive:timeout=5, max=52
	Server:Apache/2.2.22 (Debian)
	Vary:Accept-Encoding
	X-Powered-By:PHP/5.4.4-7
	*/

	$out = 'redalert(' . json_encode($data) . ');';
	$out = gzencode($out);

	$out = 'HTTP/1.1 200 OK
Content-Type: application/json
Content-Encoding: gzip
Content-Length: '.strlen($out).'
Date: ' . date('r') . '
X-Powered-By: RedAlert

' . $out;

	echo "Sending data...";
	socket_write($socket, $out, strlen($out));
	echo "OK.\n";

	/*
	echo "Reading response:\n\n";
	while ($in = socket_read($socket, 2048)) {
	    echo $in;
	}
	*/

	echo "Closing socket...";
	socket_close($socket);
	echo "OK.\n\n";
}

//$max_id = 999;
$SQL = 'SELECT MAX(alert_id) FROM alerts';
$max_id = $dbh->getOne($SQL);

while (1) {
	$SQL = 'SELECT alert_id,area_id,UNIX_TIMESTAMP(time) AS time FROM alerts WHERE alert_id > ?';
	$alerts = $dbh->getAll($SQL, $max_id);

	if ($alerts) {
		echo "Found " . sizeof($alerts) . " updates...\n";

		foreach ($alerts as $alert)
			$area_ids[] = $alert['alert_id'];
		rsort($area_ids, SORT_NUMERIC);
		$max_id = $area_ids[0];

		$SQL = 'SELECT * FROM area WHERE area_id IN (' . implode(',', $area_ids) . ')';
		$areas = $dbh->getAll($SQL);
	
		$payload = array('alerts' => $alerts, 'areas' => $areas);
		$payload = json_encode($payload);
		redalert_send($payload);
	}

	usleep(333);
}

?>

