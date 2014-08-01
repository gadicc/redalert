// RedAlert server (c) 2012 Gadi Cohen.  Please contact me to use this.
// This is essentually a relay server optimized by long polling (a technique for reverse ajax)

// Thanks for tutorial and example code at https://banu.com/blog/2/how-to-use-epoll-a-complete-example-in-c/
// From there, added additional socket support, relay functions, timing functions, fd management, etc.

/*
 * TODO:
 *
 *  * only free memory at the end, or when it changes by 5% (since most connections will reconnect immediately)
 *  * keep past sends in memory with a unique id, so newly connecting clients can catch up
 *    OR reevalutre continuous open connection with pings and other options 
 *
*/

 // TODO, clients that are doing nothing should be pruned occasionally

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <netdb.h>
#include <unistd.h>
#include <fcntl.h>
#include <sys/epoll.h>
#include <errno.h>
#include <signal.h>
#include <time.h>

// note this is max waiting events, not max open connections
#define MAXEVENTS 512

typedef enum {MSG_ALERT} message_type;
struct message_el {
	int id;
	message_type type;
	char *data;
	struct message_el *next;
};
typedef struct message_el message;

typedef enum {UNKNOWN, CLIENT, CLIENT_LISTEN, RELAY_LISTEN, RELAY} client_type;
struct client_el {
  int fd;
  client_type type;
  struct client_el *prev;
  struct client_el *next;
  
  message *msgHeadCur;
  int msgHeadWriteCount;
  message *msgTailCur;
  int msgTailWriteCount;
  message *msgTailDest;
};
typedef struct client_el client;

static int keepRunning = 1;

void intHandler(int dummy) {
  printf("Interrupted/Killed, shutting down...\n");
  keepRunning = 0;
}

static int sendPing = 0;
void checkPing() {
	sendPing = 1;
}

static int make_socket_non_blocking (int sfd) {
  int flags, s;

  flags = fcntl (sfd, F_GETFL, 0);
  if (flags == -1) {
    perror ("fcntl");
    return -1;
  }

  flags |= O_NONBLOCK;
  s = fcntl (sfd, F_SETFL, flags);
  if (s == -1) {
    perror ("fcntl");
    return -1;
  }

  return 0;
}

static int create_and_bind (char *port) {
  struct addrinfo hints;
  struct addrinfo *result, *rp;
  int s, sfd;
  int true=1;

  memset (&hints, 0, sizeof (struct addrinfo));
  hints.ai_family = AF_UNSPEC;     /* Return IPv4 and IPv6 choices */
  hints.ai_socktype = SOCK_STREAM; /* We want a TCP socket */
  hints.ai_flags = AI_PASSIVE;     /* All interfaces */

  s = getaddrinfo (NULL, port, &hints, &result);
  if (s != 0) {
    fprintf (stderr, "getaddrinfo: %s\n", gai_strerror (s));
    return -1;
  }

  for (rp = result; rp != NULL; rp = rp->ai_next) {	
    sfd = socket (rp->ai_family, rp->ai_socktype, rp->ai_protocol);
    if (sfd == -1)
      continue;

		// gadi
	  s = setsockopt(sfd, SOL_SOCKET, SO_REUSEADDR, &true, sizeof(int));
		if (s == -1) {
	    fprintf (stderr, "getaddrinfo: %s\n", gai_strerror (s));
	    return -1;
		}

	  s = bind (sfd, rp->ai_addr, rp->ai_addrlen);
	  if (s == 0) {
	    /* We managed to bind successfully! */
	    break;
	  }

    close (sfd);
  }

  if (rp == NULL) {
    fprintf (stderr, "Could not bind\n");
    return -1;
  }

  freeaddrinfo (result);

  return sfd;
}

static void clientFds(client *client_list) {
	client *client_cur;
  for (client_cur = client_list; client_cur != NULL; client_cur=client_cur->next)
  	printf("%d ", client_cur->fd);
  printf("\n");	
}

static void closeClient(client **client_list, int *client_count, client *eventClient) {
	client *client_cur;

  /* Closing the descriptor will make epoll remove it
     from the set of descriptors which are monitored. */
  close (eventClient->fd);
  printf ("Closed connection on descriptor %d\n", eventClient->fd);

  if (eventClient->type == CLIENT) {
	  if (eventClient->prev) {
	  	eventClient->prev->next = eventClient->next;
	  } else {
	  	*client_list = NULL;
	  }
	  if (eventClient->next) {
	    eventClient->next->prev = eventClient->prev;
	  }
		(*client_count)--;
	  free(eventClient);
	}
}

static void sendToClients(client *client_list, char *buf) {
	client *client_cur;
	int count = strlen(buf);

  for (client_cur = client_list; client_cur != NULL; client_cur=client_cur->next)
  	if (client_cur->type == CLIENT)
			write(client_cur->fd, buf, count);
}

static char *msgToText(message *msg) {
	static char buf[8192];
	sprintf(buf, "%x\r\n<script>a(%s);</script>\r\n",
		strlen(msg->data) + 21, msg->data);
	return buf;
}

static void sendPastMessages(client *c, message *message_list, int lastId) {
	message *msg;
	char *buf;

	for (msg = message_list; msg != NULL; msg = msg->next) {
		if (msg->id > lastId) {
			buf = msgToText(msg);
			//printf("%s\n", buf);
			write(c->fd, buf, strlen(buf));
		}
	}
}

int main (int argc, char *argv[]) {
  int sfd, sfd2, s;
  int efd;
  struct epoll_event event;
  struct epoll_event *events;

	clock_t clock_start;
  time_t time_start, time_end;
  double clock_elapsed, time_elapsed;

  struct timeval tv;
  unsigned long long msSinceEpoch;

  int client_count = 0;
  client *client_list = NULL, *client_cur = NULL;
  client relay, relayListen, clientListen, *eventClient;

  int message_count = 0;
  int lastId = 0;
  message *message_list = NULL, *message_end = NULL,
  	*message_cur = NULL, *message_tmp = NULL;

  relay.type = RELAY;
  relayListen.type = RELAY_LISTEN;
  clientListen.type = CLIENT_LISTEN;

  if (argc != 3) {
    fprintf (stderr, "Usage: %s [client port] [relay port]\n", argv[0]);
    exit (EXIT_FAILURE);
  }

  efd = epoll_create1 (0);
  if (efd == -1) {
    perror ("epoll_create");
    abort ();
  }

  /* client port socket */
  sfd = create_and_bind (argv[1]);
  if (sfd == -1)
    abort ();

  s = make_socket_non_blocking (sfd);
  if (s == -1)
    abort ();

  s = listen (sfd, SOMAXCONN);
  if (s == -1) {
    perror ("listen");
    abort ();
  }

  //event.data.fd = sfd;
  event.data.ptr = &clientListen;
  clientListen.fd = sfd;
  event.events = EPOLLIN | EPOLLET;
  s = epoll_ctl (efd, EPOLL_CTL_ADD, sfd, &event);
  if (s == -1) {
    perror ("epoll_ctl");
    abort ();
  }

  /* relay port socket */
  sfd2 = create_and_bind (argv[2]);
  if (sfd2 == -1)
    abort ();

  s = make_socket_non_blocking (sfd2);
  if (s == -1)
    abort ();

  s = listen (sfd2, SOMAXCONN);
  if (s == -1) {
    perror ("listen");
    abort ();
  }

  //event.data.fd = sfd2;
  event.data.ptr = &relayListen;
  relayListen.fd = sfd2;
  event.events = EPOLLIN | EPOLLET;
  s = epoll_ctl (efd, EPOLL_CTL_ADD, sfd2, &event);
  if (s == -1) {
    perror ("epoll_ctl");
    abort ();
  }

  /* Buffer where events are returned */
  events = calloc (MAXEVENTS, sizeof event);

  signal(SIGINT, intHandler);
  signal(SIGKILL, intHandler);
  signal(SIGALRM, checkPing);
  alarm(1);

  /* The event loop */
  while (keepRunning) {
    int n, i, j;

    n = epoll_wait (efd, events, MAXEVENTS, 100);
    for (i = 0; i < n; i++) {
			eventClient = (client *)events[i].data.ptr;

		  if ((events[i].events & EPOLLERR)
		  		|| (events[i].events & EPOLLHUP)
		  		|| (!(events[i].events & EPOLLIN))) {

		  	int error = 0;
		  	socklen_t errlen = sizeof(error);
		  	if (getsockopt(eventClient->fd, SOL_SOCKET, SO_ERROR, (void *)&error, &errlen) == 0) {
		  		if (error != 104) // Connection reset by peer 
				    printf("error %d %s\n", error, strerror(error));
				}

				if (error != 104) {
			    /* An error has occured on this fd, or the socket is not
			       ready for reading (why were we notified then?) */
		      fprintf (stderr, "epoll error on fd %d, mask %d ", eventClient->fd, events[i].events);
		    	fprintf (stderr, "EPOLLERR=%d ", (events[i].events & EPOLLERR));
		    	fprintf (stderr, "EPOLLHUP=%d ", (events[i].events & EPOLLHUP));
		    	fprintf (stderr, "EPOLLRDHUP=%d ", (events[i].events & EPOLLRDHUP));
		    	fprintf (stderr, "EPOLLIN=%d\n", (events[i].events & EPOLLIN));

		    	if(events[i].events & EPOLLRDHUP)
		    		fprintf(stderr, "EPOLLRDHUP\n");
		    }

        closeClient(&client_list, &client_count, eventClient);
	      continue;

    	} else if (eventClient->fd == sfd || eventClient->fd == sfd2) {

        /* We have a notification on the listening socket, which
           means one or more incoming connections. */
        while (1) {
	        struct sockaddr in_addr;
	        socklen_t in_len;
	        int infd;
	        char hbuf[NI_MAXHOST], sbuf[NI_MAXSERV];

	        in_len = sizeof in_addr;
	        infd = accept (eventClient->fd, &in_addr, &in_len);

	        if (infd == -1) {
            if ((errno == EAGAIN) || (errno == EWOULDBLOCK)) {
              // We have processed all incoming connections.
                break;
            } else {
              perror ("accept");
              break;
            }
	        }

	        /* New connection */
				  if (eventClient->fd == sfd2) {
						relay.fd = infd;
						event.data.ptr = &relay;
				  } else {
						// keep track of clients
						client_cur = (client *)malloc(sizeof(client));
						//client_cur->type = CLIENT;
						if (!client_cur) {
							fprintf (stderr, "malloc failed\n");
							exit (EXIT_FAILURE);
						}
						event.data.ptr = client_cur;
						client_cur->fd = infd;
						client_cur->prev = NULL;
						if (client_list)
							client_list->prev = client_cur;
						client_cur->next = client_list;
						client_list = client_cur;
				  }

          s = getnameinfo (&in_addr, in_len, hbuf, sizeof hbuf,
          	sbuf, sizeof sbuf, NI_NUMERICHOST | NI_NUMERICSERV);

          if (s == 0) {
//            printf("Accepted connection on descriptor %d "
//                   "(host=%s, port=%s)\n", infd, hbuf, sbuf);
          }

          /* Make the incoming socket non-blocking and add it to the
             list of fds to monitor. */
          s = make_socket_non_blocking (infd);
          if (s == -1)
            abort ();

          //event.data.fd = infd;
          event.events = EPOLLIN | EPOLLET;
          s = epoll_ctl (efd, EPOLL_CTL_ADD, infd, &event);
          if (s == -1) {
            perror ("epoll_ctl");
            abort ();
          }

          if (eventClient->fd == sfd2) {
						char str[11];
						sprintf(str, "%d\n", lastId);
						write(infd, str, strlen(str));          	
          }

        } /* while(1) */

      	continue;

    	} else {

        /* We have data on the fd waiting to be read. Read and
           display it. We must read whatever data is available
           completely, as we are running in edge-triggered mode
           and won't get a notification again for the same
           data. */
        int done = 0;

        while (1) {
          ssize_t count;
          char buf[8192];

          count = read (eventClient->fd, buf, sizeof buf);
          if (count == -1) {
            /* If errno == EAGAIN, that means we have read all
               data. So go back to the main loop. */
            if (errno != EAGAIN) {
              perror ("read");
              done = 1;
            }
            break;
          } else if (count == 0) {
            /* End of file. The remote has closed the
               connection. */
            done = 1;
            break;
          }

					// past this point is data waiting to be read

	    		if (eventClient->type == RELAY) {

	          /* Data is from relay, write it to all clients and close connections */

	    			char *type;
	    			message *msg;
	    			char *data;
	    			char *toSend;

		    		*(buf+count) = 0;
		    		// printf("<< %s\n", buf);

						msg = (message *)malloc(sizeof(message));
						msg->id = atoi(strtok(buf, " "));
	   				type = strtok(NULL, " ");
	   				if (strcmp(type,"alert"))
	   					msg->type = MSG_ALERT;

	   				data = strtok(NULL, " ");
	   				*(data + strlen(data) - 2) = 0; // strip newline
	   				msg->data = (char *)malloc(strlen(data)+1);
	   				strcpy(msg->data, data);

	   				toSend = msgToText(msg);
	   				// printf("%s\n", toSend);

	   				msg->next = message_list;
	   				message_list = msg;
	   				if (!message_end)
	   					message_end = msg;
	   				if (msg->id > lastId)
	   					lastId = msg->id;

		   	    clock_start = clock();
				    time(&time_start);

				    sendToClients(client_list, toSend);

					  time(&time_end);
					  clock_elapsed = (double)(clock() - clock_start) / CLOCKS_PER_SEC;
					  time_elapsed = difftime(time_end, time_start);

					  printf("Wrote to %d clients using %f CPU seconds and %f clock seconds\n",
						 	client_count, clock_elapsed, time_elapsed);

		      	alarm(1);

	   			} else {

						// potentially, we could process headers/GET/cookies now... but no reason to
	   				// printf("\n---%d\n%s---\n\n", eventClient->fd, buf);

	   				char *line;
	   				char *tok, *page, *query, *key, *value;
	   				char *query_r;
	   				int lastId = 0;
	   				int count;
						message *msg;

	   				// [ASSUMPTION] 1st line is GET URL PROTO
	   				line = strtok(buf, "\n");
	   				// printf("Line: %s\n", line);
	   				tok = strtok(line, " ");

	   				if (strcmp(tok, "GET") == 0) {
	   					tok = strtok(NULL, " ");
	   					page = strtok(tok, "?");
	   					query = strtok(NULL, "?");
	   					//printf("page '%s' query '%s'\n", page, query);

	   					if (strcmp(page, "/redalert") != 0) {

	   						char buf[1024] = "HTTP/1.1 404 Not Found\n\n";
	   						write(eventClient->fd, buf, strlen(buf));
	   						done = 1;

	   					} else {

	   						eventClient->msgHeadCur = message_list;
	   						eventClient->msgTailCur = message_list;

	   						// TODO, null by default unless limit specified
	   						// TODO, need to differentiate between NULL and 0,
	   						// and retroactively update if clients connect b4 1st msg
	   						eventClient->msgTailDest = message_end;

		   					if (query)
		   					for (query=strtok_r(query, "&", &query_r); query != NULL; query=strtok_r(NULL, "&", &query_r)) {
									key = strtok(query, "=");
									value = strtok(NULL, "=");
									//printf("key '%s' value '%s'\n", key, value);

									if (strcmp(key,"lastId") == 0)
										lastId = atoi(value);

									// msgTailDest
									if (strcmp(key,"limit") == 0) {
										lastId = atoi(value);
										for (msg = message_list, count=0;
													msg != NULL && count < lastId;
													msg = msg->next, count++);
										if (msg)
											eventClient->msgTailDest = msg;
										else
											eventClient->msgTailDest = message_end;
									}
		   					}

								client_count++;
		   					eventClient->type = CLIENT;

		   					char buf[1024] = "HTTP/1.1 200 OK\r\n\
Content-Type: text/html; charset=utf-8\r\n\
Transfer-Encoding: chunked\r\n\
\r\n\
6a\r\n\
<html><body>\n\
<script>function a(a){window.top.postMessage('redalert ' + JSON.stringify(a), '*');}</script>\r\n";
			          write(eventClient->fd, buf, strlen(buf));
			          //sendPastMessages(eventClient, message_list, lastId);
			        }
	   				}

	   				//tok = strtok(NULL, " ");
	   				//printf("> '%s'\n", tok);

			  	}

        } /* while(1) */

    		if (done) {

	        closeClient(&client_list, &client_count, eventClient);

        } /* if (done) */
      }
    } /* epoll loop */

    // TODO, move to main send loop
    if (sendPing) {
    	char buf[8192], buf2[8192 + 10];
    	int count;
    	sendPing = 0;

			gettimeofday(&tv, NULL);
			msSinceEpoch =
				(unsigned long long)(tv.tv_sec) * 1000 +
	    	(unsigned long long)(tv.tv_usec) / 1000;

			sprintf(buf, "<script>a(%llu);</script>", msSinceEpoch);
			sprintf(buf2, "%x\r\n%s\r\n", strlen(buf), buf);
			sendToClients(client_list, buf2);

    	alarm(1);
    }

    // main send loop
    for (client_cur = client_list; client_cur != NULL; client_cur=client_cur->next) {
    	if (client_cur->type != CLIENT)
    		continue;

    	char *buf;
    	ssize_t writeCount;

    	// send to tail
    	if (client_cur->msgTailDest && client_cur->msgTailCur != client_cur->msgTailDest) {
    		printf("i have to send\n");
				for (message_cur=client_cur->msgTailCur; message_cur != NULL; message_cur=message_cur->next) {
		    	buf = msgToText(message_cur);
		    	if (eventClient->msgTailWriteCount)
		    		buf += eventClient->msgTailWriteCount;
					writeCount = write(client_cur->fd, buf, strlen(buf));
					if (writeCount != strlen(buf)) {
						client_cur->msgTailWriteCount = writeCount;
						printf("msg %d fd %d, writeCount %d, expected %d\n",
							message_cur->id, client_cur->fd, writeCount, strlen(buf));
						printf("%d %s\n", errno, strerror(errno));
						break;
					}
					if (message_cur == client_cur->msgTailDest) {
						printf("reached end\n");
						client_cur->msgTailWriteCount = 0;
						break;
					}
				}
				client_cur->msgTailCur = message_cur;
			}
    } /* main send loop */

  } /* while keepRunning */

  printf("Closing open sockets and connections...\n");
  free (events);

	for (client_cur = client_list; client_cur != NULL; client_cur=client_cur->next) {
		if (client_cur->prev)
			free(client_cur->prev);
		close(client_cur->fd);
	}
	free(client_cur);

	message_cur = message_list;
	while (message_cur != NULL) {
		message_tmp = message_cur;
		message_cur = message_cur->next;
		free(message_tmp);
	}

	close(clientListen.fd);
	close(relayListen.fd);

  return EXIT_SUCCESS;
} /* main */
