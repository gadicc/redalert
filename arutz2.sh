#!/bin/sh
while `true`; do
   date
#   php arutz2_store.php
#   php arutz2_process.php
#   php iosapp.php
#   php iosapp_process.php
	php pikud_store.php
	php pikud_process.php
   sleep 1
done
