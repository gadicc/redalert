<?php

$lines = split("\n", file_get_contents('pikud_areas.csv'));
$areas = array();
foreach ($lines as $line) {
	$line = split(',', $line);
	$code = $line[1];
	$area = $line[0];
	if (isset($areas[$code])) {
		$areas[$code][] = $area;
	} else {
		$areas[$code] = array($area);
	}
	echo $code . ',"' . $area . ', ישראל"' . "\n";
}

file_put_contents('pikud_areas.dat', serialize($areas));
