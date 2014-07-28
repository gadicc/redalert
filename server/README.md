{
	id: 
	type: 'alert',
	time: new Date().getTime(),
	areas: []
}

To relay:

msgId type JSON-incl-id-type
2 alert {id:2,type:"alert",time:1406275581644,areas:[250]}

echo "1 alert {id:1,type:\"alert\",time:1406275551644,areas:[248]}" \
	| telnet localhost 8081
echo "2 alert {id:2,type:\"alert\",time:1406275581644,areas:[250]}" \
	| telnet localhost 8081


1 alert {id:1,type:\"alert\",time:1406275551644,areas:[248]}
2 alert {id:2,type:\"alert\",time:1406275581644,areas:[250]}
