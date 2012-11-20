<?php

include('gadi_db.php');

$SQL = 'SELECT area_id,area_name,area_json FROM area';
$data = $dbh->getAll($SQL);

echo json_encode($data);


