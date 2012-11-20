<?php

include('gadi_db.php');

/*
do:check-alerts
lastcheck:1353241500
r:0.7597697484306991
*/
/* 
<?xml version="1.0" encoding="windows-1255" ?><ajax-response><value id="alerts_html">&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:37&lt;/b&gt; באשדוד ובמ.א. חבל יבנה
&lt;/td&gt;
&lt;/tr&gt;&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:25&lt;/b&gt; במ.א. אשכול
&lt;/td&gt;
&lt;/tr&gt;&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:17&lt;/b&gt; כפר עזה וסעד -
&lt;/td&gt;
&lt;/tr&gt;&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:17&lt;/b&gt; נחל עוז ואלומים -
&lt;/td&gt;
&lt;/tr&gt;</value><value id="new_alert">1</value><value id="time">1353242220</value><value id="next_check">60</value></ajax-response>
*/

$result = '<?xml version="1.0" encoding="utf-8" ?><ajax-response><value id="alerts_html">&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:37&lt;/b&gt; באשדוד ובמ.א. חבל יבנה
&lt;/td&gt;
&lt;/tr&gt;&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:25&lt;/b&gt; במ.א. אשכול
&lt;/td&gt;
&lt;/tr&gt;&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:17&lt;/b&gt; כפר עזה וסעד -
&lt;/td&gt;
&lt;/tr&gt;&lt;tr&gt;
&lt;td style=&quot;padding-right: 4px; text-align: right; background-color:#F9E6E5;&quot;&gt;
&lt;img src=&quot;/images/red-dot.png&quot;&gt;
&lt;b style=&quot;color:red&quot;&gt;היום 14:17&lt;/b&gt; נחל עוז ואלומים -
&lt;/td&gt;
&lt;/tr&gt;</value><value id="new_alert">1</value><value id="time">1353242220</value><value id="next_check">60</value></ajax-response>';

function get_arutz2_req($lastcheck) {
	// $url = 'http://isra-media.tk/ajax.php';  
	$url = 'www.isramedia.net/ajax.php'; // since 20nov12 17h50
	$fields = array(
		'do' => 'check-alerts',
		'lastcheck' => $lastcheck,
//		'r' => '0.36503668734803796',
	);
	$fields_string = '';
	foreach($fields as $key=>$value) { $fields_string .= $key.'='.$value.'&'; }
	rtrim($fields_string, '&');

	$headers = array(
		'Referer: http://isra-media.tk/2/%D7%A2%D7%A8%D7%95%D7%A6%D7%99%D7%9D-%D7%9E%D7%99%D7%A9%D7%A8%D7%90%D7%9C/%D7%A2%D7%A8%D7%95%D7%A5-2-%D7%A9%D7%99%D7%93%D7%95%D7%A8-%D7%97%D7%99',
	);

	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_POST, count($fields));
	curl_setopt($ch, CURLOPT_POSTFIELDS, $fields_string);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE); 
	curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
	$result = curl_exec($ch);
	curl_close($ch);

	return $result;
}

function get_arutz2($lastcheck) {
	global $dbh;

//	$result = $GLOBALS['result'];
	$result = get_arutz2_req($lastcheck);
var_dump($result);
	$xml = simplexml_load_string($result);

	foreach($xml->children() as $child) {
		$attrs = $child->attributes();
		if ($child->getName() == "value") {
			$id = (string) $attrs['id'];
			$values[$id] = (string) $child;
		}
	}
	
	//var_dump($values);

	if (!isset($values['new_alert'])) return;
	$pattern = '#^<b style="color:red">(.*)</b>(.*)$#m';
	preg_match_all($pattern, $values['alerts_html'], $matches, PREG_SET_ORDER);
	foreach($matches as $match) {
		$orig_time = trim($match[1]);
		$location = $match[2];
		$location = trim($location);
		$location = trim($location, "-");

		// "hayom" in hebrew is 8 chars (unicode)
		if (substr($orig_time, 0, 8) == "היום") {
			$time = substr($orig_time, 9);
			$time = date("Y-m-d ", $lastcheck) . $time . ':00'; 
			echo "$time - $location<br>\n";
		} else {
			echo __FILE__.':'.__LINE__.' - Go add support for timing of: "' . $orig_time . '"<br />';
		}

		$SQL = 'INSERT IGNORE INTO arutz2 (time, orig_time, location, lastcheck) VALUES (?, ?, ?, ?)';
		$dbh->query($SQL, array($time, $orig_time, $location, $lastcheck));
	}
}

// unfortunately we can't go back in time, they just return an empty request
$lastcheck = time()-60;
get_arutz2($lastcheck);

/*
	$location = preg_replace('/מ.א./', 'מועצה אזורית', $location);

	// these will only work until we have a city name startin with vav ("ו") or bet ("ב")
	$locations = explode(' ו', $location);
	foreach($locations as $location) {
		$location = preg_replace('/^ב/', '', $location);
		echo $location . "<br>";	
	
	}
*/

echo $debug_out;

?>
