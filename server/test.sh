#!/bin/sh

telnet localhost 8081 <<__END__
1 alert {id:1,type:\"alert\",time:1406275551644,areas:[248]}
2 alert {id:2,type:\"alert\",time:1406275581644,areas:[250]}
__END__

