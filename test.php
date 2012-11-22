<html>

<head>
<title>Tzeva-Adom, test alerts</title>
</head>

<body>

<h1>Tzeva-Adom, test alerts</h1>

<?php
include('gadi_db.php');

if (isset($_REQUEST['action']) && $_REQUEST['action']=="submit") {

	$SQL = 'INSERT INTO alerts (time, area_id, source, source_id) VALUES (NOW(), ?, ?, ?)';
	$dbh->query($SQL, array($_REQUEST['area_id'], 'test', 0));
	?>
	<h2>Success</h2>
	<p>New alert successfully added, see <a href="#track">below</a> for details how to track it.</p>

<?php } ?>

<h2>Create a Test Alert</h2>

<form action="test.php" method="get">
<input type="hidden" name="action" value="submit" />

<select name="area_id">
<?php
$SQL = 'SELECT * from area';
$areas = $dbh->getAll($SQL);

foreach($areas as $area)
	echo "<option value='${area[area_id]}'>${area[area_name]}</option>\n";
?>
</select>

<input type="submit" value="Create new alert"/>
</form>

<a name="track">
<h2>Tracking Results</h2>

<p>Track your results using:</p>

<ul>
<li><a href="index.html">index.html</a> - live display on map IF YOU CHECK "ENABLE TEST ALERTS"
<li><a href="example.php">example.php</a> - live update of tests
<li><a href="alerts.php?fmt=html&source=test">alerts.php?fmt=html&source=test</a> - previous tests
</ul>

<h2>API</h2>

<p>For more details on the API, see <a href="docs">/docs</a>.</p>


