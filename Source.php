<?php

/* there are some other common functions here too, for now */

function geolookup($q) {
	$q .= ', ישראל';
	$url = 'http://maps.google.com/maps/geo?q=' . urlencode($q);
	$data = file_get_contents($url);
	sleep(1);
	return json_decode($data);
}

$areas = array();
function area2id($area_name) {
	global $areas, $dbh;

	// process cache
	if (isset($areas[$area_name]))
		return $areas[$area_name];

	// already in DB
	$SQL = 'SELECT area_id FROM area WHERE area_name=? LIMIT 1';
	$area_id = $dbh->getOne($SQL, $area_name);
	if ($area_id) {
		$areas[$area_name] = $area_id;
		return $area_id;
	}

	// not in db, first find location data
	echo "Looking up for first-time: $area_name<br>";
	$geo = geolookup($area_name);
	if (isset($geo->Placemark[0]->Point->coordinates)) {
		$coords = ($geo->Placemark[0]->Point->coordinates);
		$long = $coords[0]; $lat = $coords[1];
	} else {
		$lat = 0; $long = 0;
	}

	$SQL = 'INSERT INTO area (area_name, area_lat, area_long, area_json) VALUES (?, ?, ?, ?)';
	$dbh->query($SQL, array($area_name, $lat, $long, json_encode($geo)));

	$SQL = 'SELECT LAST_INSERT_ID()';
	$area_id = $dbh->getOne($SQL);
	$areas[$area_name] = $area_id;
	return $area_id;
}

class Source {

	protected $source_id;
	protected $dbSourceId;
	private $last_record = 0;

	function __construct($source_id, $dbSourceId = null) {
		$this->source_id = $source_id;
		$this->dbSourceId = $dbSourceId ? $dbSourceId : 'id';
	}

	/** Description of lastRecordId()
	 *
	 * Return (after fetching, if necessary) the ID of the last row we last said we processed
	 *
	 * @return     id of last process row from source
	 */
	function getLastRecordId() {
		global $dbh;
		if (!$this->last_record) {
			$SQL = 'SELECT last_record FROM sources WHERE source_id=?';
			$last_record = $dbh->getOne($SQL, $this->source_id);
			if ($last_record)
				$this->last_record = $last_record;
		}
		return $this->last_record;
	}

	function setLastRecordId($last_record = null) {
		global $dbh;
		if ($last_record)
			$this->last_record = $last_record;
		$SQL = 'INSERT INTO sources (source_id, last_record) VALUES (?, ?)
			ON DUPLICATE KEY UPDATE last_record=VALUES(last_record)';
		$dbh->query($SQL, array($this->source_id, $this->last_record));
	}

	/** Description of getRows($aboveRow)
	 *
	 * @param $aboveRows - fetch rows above this id (default: $this->last_record)
	 * @return           - array of associative array of row straight from db
	 */
	function getRows($aboveRow = null, $time = false) {
		global $dbh;
		if (!$aboveRow) $aboveRow = $this->getLastRecordId();
		$SQL = 'SELECT *';
		if ($time)
			$SQL .= ',UNIX_TIMESTAMP(`time`) as `time`';
		$SQL .=' FROM `'.$this->source_id.'` WHERE `'.$this->dbSourceId.'` > ?';
		return $dbh->getAll($SQL, $aboveRow);
	}

	/** Description of alertStore($source_id, $time, $location, $debug=false)
	 *
	 * @param $source_id - ID of row from scraper
	 * @param $time      - unixtime of event (GMT+0)
	 * @param $location  - area_id from DB
	 */
	// TODO, duplicate checks and how to handle them
	function alertStore($source_id, $time, $location, $debug=false) {
		global $dbh;
		echo $this->source_id . " $time $location<br>";
		$area_id = area2id($location);
		flush();

		$SQL = 'INSERT INTO alerts (time, area_id, source, source_id)
			VALUES (FROM_UNIXTIME(?), ?, ?, ?)';
		$dbh->query($SQL, array($time, $area_id, $this->source_id, $source_id), $debug);
	}


	// Getters

	function getSourceId() {
		return $this->source_id;
	}
}
