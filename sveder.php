<?php

// this is just a straight fetch, used to get past cross-domain security restrictions in javascript
echo file_get_contents('http://redalert.sveder.com/api/latest');

