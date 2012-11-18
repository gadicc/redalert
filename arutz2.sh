#!/bin/sh
while `true`; do
   date
   php arutz2_store.php
   php iosapp.php
   sleep 60
done
