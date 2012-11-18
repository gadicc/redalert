<?php

// this code is from another project I'm working on it, you're welcome to use it for this project too

$dsn = array(
	'username' => "red",
	'password' => "red",
	'hostspec' => "localhost",
	'database' => "red",
	'phptype' => "mysql"
);
$sql_bench = false;

$debug = true;
$debug_out = '';
function debug_out() {
	global $debug, $debug_out;
	if (!isset($debug)) return;
	
	$vars = func_get_args();
	$debug_out .= "<div>\n";
	foreach($vars as $var)
		$debug_out .= $var;
	$debug_out .= "</div>\n";
}

function string_vardump() {
	ob_start();
	$var = func_get_args();
	call_user_func_array('var_dump', $var);
	return ob_get_clean(); 
}

Class GBE_PDO extends PDO {
	
	private $sqlbench = false;
	private $sqlbenchQueries = array();
 
	public static function exception_handler($exception) {
		// Output the exception details
		die('Uncaught exception: ' . $exception->getMessage());
	}

	public function __construct($dsn, $username='', $password='', $driver_options=array()) {
		
			/* Don't expose our credentials if something goes wrong
			   http://www.php.net/manual/en/pdo.connections.php#94100 */
            set_exception_handler(array(__CLASS__, 'exception_handler'));
            parent::__construct($dsn, $username, $password, $driver_options);
            restore_exception_handler();
            
            // default: sqlbench=true when develserver=true
            $this->sqlbench = isset($GLOBALS['sql_bench'])
            	? ($GLOBALS['sql_bench']==3 ? $GLOBALS['gbe']->isDevelServer() : false)
            	: $this->sqlbench = $GLOBALS['sql_bench'];
	}
        
    // Create some Pear::DB style functions, add support for prepared stmts
        
	private function getFromSQL($SQL, $params, $fetch_mode, $debug = false) {
      	if ($debug) {
      		echo "$SQL<br>\n";
      		var_dump($params);
      	}
      	
		if ($this->sqlbench)
			$now = microtime(true);
		
       	$stmt = $this->prepare($SQL);
       	if (!is_array($params)) $params = array($params);
       	
       	if ($stmt->execute($params)) {
       		if ($this->sqlbench)
       			$this->sqlbenchQueries[$SQL] = microtime(true) - $now;
       		return $stmt->fetchAll($fetch_mode);
       	} else {
        	debug_out(string_vardump($stmt),
        		string_vardump($stmt->errorInfo()));
        }
	}
        
    public function getAll($SQL, $params=NULL, $debug = false) {
      	return $this->getFromSQL($SQL, $params, PDO::FETCH_ASSOC, $debug);
    }
    public function getCol($SQL, $params=NULL, $debug = false) {
      	return $this->getFromSQL($SQL, $params, PDO::FETCH_COLUMN, $debug);
    }
    public function getRow($SQL, $params=NULL, $debug = false) {
      	$data = $this->getFromSQL($SQL, $params, PDO::FETCH_ASSOC, $debug);
	   	return isset($data[0]) ? $data[0] : null;
    }
	public function getOne($SQL, $params=NULL, $debug = false) {
		$data = $this->getFromSQL($SQL, $params, PDO::FETCH_NUM, $debug);
		return empty($data) ? null : $data[0][0];
	}
	public function query($SQL, $params=NULL, $debug = false) {
       	// NOTE, we override the default PDO->query()... do we need it?
       	if ($debug) {
       		echo "$SQL<br>\n";
       		var_dump($params);
       	}
       	$stmt = $this->prepare($SQL);
       	if ($stmt->execute($params)) {
       		return true;        		
       	} else {
       		debug_out(string_vardump($stmt),
       			string_vardump($stmt->errorInfo()));
       		return false;
      	}
	}

    /**
     * 
     * Expects a two-column result set, and creates an associative
     * array where each pair uses the first column of the row as the key
     * and the second column as the value.
     * 
     * @param string $SQL
     */ 
     public function getAssoc($SQL, $params=NULL, $debug = false) {
       	if ($debug) {
       		echo "$SQL<br>\n";
       		var_dump($params);
       	}
       	$stmt = $this->prepare($SQL);
		if ($stmt->execute($params)) {
  			while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
    			$out[$row[0]] = $row[1];
  			}
			return isset($out) ? $out : null;
       	} else {
       		debug_out(string_vardump($stmt),
       			string_vardump($stmt->errorInfo()));
       		return false;
       	}
	}

        /* like above, but for entire row (uses first el as key) */
        public function getAssocRows($SQL, $params=NULL, $debug = false) {
        	if ($debug) {
        		echo "$SQL<br>\n";
        		var_dump($params);
        	}
        	$stmt = $this->prepare($SQL);
			if ($stmt->execute($params)) {
  				while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
  					$firstKey = array_keys($row); $firstKey = $firstKey[0];
    				$out[$row[$firstKey]] = $row;
  				}
				return isset($out) ? $out : null;
			}
        }
        
        /* Below we'll create some abstraction functions for inserting,
         * updating and retreiving data.  Besides removing the need
         * for writing SQL statements (which I actually like doing),
         * the abstraction allows for some automated caching ala
         * memcached and client-side javascript.
         */
        
        /*
        public function insert($table, $assocValues) {
        	$SQL = "INSERT INTO `$table` (";
        	$SQL2 = '';
        	foreach (array_keys($assocValues) as $field) {
        		$SQL .= "`$field`, ";
        		$SQL2 
        	$SQL .= substr($SQL, 0, -2) . ') VALUES (';
        	foreach ($assocValues as $field)
        	
        }
        */
        
        public function sqlbench_toDebug() {
        	if (!$this->sqlbench) return;
        	$out = '';
        	arsort($this->sqlbenchQueries);
        	foreach($this->sqlbenchQueries as $SQL => $time)
        		$out .= sprintf('<p>"%s" took %.4f ms</p>',
        			htmlspecialchars($SQL), $time*1000);
        	$total = array_sum($this->sqlbenchQueries);
        	$out .= sprintf('<p>Total time in SQL queries: %.4f ms', $total*1000);
        	debug_out($out);
        }
        
        function touch($table, $partition=0) {
        	$SQL = 'UPDATE `table_updates` SET `time`=now() WHERE `table`=? AND `partition_id`=?';
        	$this->query($SQL, array($table, $partition));
        }
}

// Quote variable to make safe
// 0 gets quoted as '0', should we change this?  quote everything?  check size?
function quote_smart($value) {
	global $dbh;
	
	// Stripslashes
	if (get_magic_quotes_gpc()) {
		$value = stripslashes($value);
	}
	
	// Quote if not integer
	if (!is_numeric($value) || (strlen($value)>0 && $value[0]=="0")) {
		$value = $dbh->quote($value);
	}
	return $value;
}

function dbh_from_dsn_array($dsn) {
	$user = $dsn['username']; $pass = $dsn['password'];
	$dsn = $dsn['phptype'] . ':host=' . $dsn['hostspec'] . ';dbname=' . $dsn['database'];	
	$dbh = new GBE_PDO($dsn, $user, $pass, array(PDO::ATTR_PERSISTENT => true));	
	return $dbh;
}
$dbh = dbh_from_dsn_array($dsn);
$dbh->exec("SET NAMES utf8");
$dbh->exec("SET time_zone = '+00:00'");

function insert_and_getid($SQL, $dbh = null) {
	if (!$dbh && isset($GLOBALS['dbh']))
		$dbh = $GLOBALS['dbh'];
	$dbh->query($SQL);
	$SQL = "SELECT LAST_INSERT_ID()";
	return $dbh->getOne($SQL);
}

function insert_sql_array($array, $table, $options=NULL) {
	$SQL = "INSERT " .
		(isset($options["insert_ignore"]) ? "IGNORE " : "") .
		"INTO `$table` (";
	$SQL2 = ") VALUES (";
	foreach ($array as $key => $value) {
		$SQL .= "`$key`, ";
		$SQL2 .= (isset($options["noquote"]) ? $value : quote_smart($value)) . ", ";
	}
	return substr($SQL, 0, -2) . substr($SQL2, 0, -2) . ")";
}
function insert_sql_array_noquote($array, $table, $options=NULL) {
	$SQL = "INSERT " .
		(isset($options["insert_ignore"]) ? "IGNORE " : "") .
		"INTO `$table` (";
	$SQL2 = ") VALUES (";
	foreach ($array as $key => $value) {
		$SQL .= "`$key`, ";
		$SQL2 .= $value . ", ";
	}
	return substr($SQL, 0, -2) . substr($SQL2, 0, -2) . ")";
}
function update_sql_array($array, $table, $options=NULL) {
	if (isset($options["pri_key"])) {
		if (!is_array($options["pri_key"]))
				$pri_key=explode(":",$options["pri_key"]);
		else $pri_key = $options["pri_key"];
		foreach ($pri_key as $pk)
			if (!isset($array[$pk]))
				die("Primary key $pk not in array for $table");
	} else $pri_key=NULL;
	
	$SQL = "UPDATE `$table` SET ";
	foreach ($array as $key => $value)
		if (!in_array($key, $pri_key))
			$SQL .= "`$key`=" . 
				(isset($options["noquote"]) ? $value : quote_smart($value)) .
				", ";
	$SQL = substr($SQL, 0, -2);
	if (isset($options["where"]))
		$SQL .= " WHERE " . $options["where"];
	elseif($pri_key) {
		$SQL .= " WHERE ";
		foreach ($pri_key as $pk)
			$SQL .= "`$pk`=" . $array[$pk] . " AND";
		$SQL = substr($SQL, 0, -4);
	}
	return $SQL;
}

?>
