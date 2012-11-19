#!/bin/sh
while `true`; do
   date
   php arutz2_store.php
   php arutz2_process.php
   php iosapp.php
   php iosapp_process.php
   sleep 60
done
