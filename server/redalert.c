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

struct client_el {
   int fd;
   struct client_el *next;
};
typedef struct client_el client;

static int keepRunning = 1;

void intHandler(int dummy) {
    printf("Interrupted/Killed, shutting down...\n");
    keepRunning = 0;
}

static int
make_socket_non_blocking (int sfd)
{
  int flags, s;

  flags = fcntl (sfd, F_GETFL, 0);
  if (flags == -1)
    {
      perror ("fcntl");
      return -1;
    }

  flags |= O_NONBLOCK;
  s = fcntl (sfd, F_SETFL, flags);
  if (s == -1)
    {
      perror ("fcntl");
      return -1;
    }

  return 0;
}

static int
create_and_bind (char *port)
{
  struct addrinfo hints;
  struct addrinfo *result, *rp;
  int s, sfd;
  int true=1;

  memset (&hints, 0, sizeof (struct addrinfo));
  hints.ai_family = AF_UNSPEC;     /* Return IPv4 and IPv6 choices */
  hints.ai_socktype = SOCK_STREAM; /* We want a TCP socket */
  hints.ai_flags = AI_PASSIVE;     /* All interfaces */

  s = getaddrinfo (NULL, port, &hints, &result);
  if (s != 0)
    {
      fprintf (stderr, "getaddrinfo: %s\n", gai_strerror (s));
      return -1;
    }

  for (rp = result; rp != NULL; rp = rp->ai_next)
    {	
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
      if (s == 0)
        {
          /* We managed to bind successfully! */
          break;
        }

      close (sfd);
    }

  if (rp == NULL)
    {
      fprintf (stderr, "Could not bind\n");
      return -1;
    }

  freeaddrinfo (result);

  return sfd;
}

int
main (int argc, char *argv[])
{
  int sfd, sfd2, s, sfd2in;
  int efd;
  struct epoll_event event;
  struct epoll_event *events;

  clock_t clock_start;
  time_t time_start, time_end;
  double clock_elapsed, time_elapsed;  

  int client_count = 0;
  client *client_list = NULL, *client_cur = NULL;

  if (argc != 3)
    {
      fprintf (stderr, "Usage: %s [client port] [relay port]\n", argv[0]);
      exit (EXIT_FAILURE);
    }

  efd = epoll_create1 (0);
  if (efd == -1)
    {
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
  if (s == -1)
    {
      perror ("listen");
      abort ();
    }

  event.data.fd = sfd;
  event.events = EPOLLIN | EPOLLET;
  s = epoll_ctl (efd, EPOLL_CTL_ADD, sfd, &event);
  if (s == -1)
    {
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
  if (s == -1)
    {
      perror ("listen");
      abort ();
    }

  event.data.fd = sfd2;
  event.events = EPOLLIN | EPOLLET;
  s = epoll_ctl (efd, EPOLL_CTL_ADD, sfd2, &event);
  if (s == -1)
    {
      perror ("epoll_ctl");
      abort ();
    }

  /* Buffer where events are returned */
  events = calloc (MAXEVENTS, sizeof event);

   signal(SIGINT, intHandler);
   signal(SIGKILL, intHandler);

  /* The event loop */
  while (keepRunning)
    {
      int n, i, j;

      n = epoll_wait (efd, events, MAXEVENTS, -1);
      for (i = 0; i < n; i++)
	{
	  if ((events[i].events & EPOLLERR) ||
              (events[i].events & EPOLLHUP) ||
              (!(events[i].events & EPOLLIN)))
	    {
              /* An error has occured on this fd, or the socket is not
                 ready for reading (why were we notified then?) */
	      fprintf (stderr, "epoll error\n");
	      close (events[i].data.fd);
	      continue;
	    }

	  else if (events[i].data.fd == sfd || events[i].data.fd == sfd2)
	    {
              /* We have a notification on the listening socket, which
                 means one or more incoming connections. */
              while (1)
                {
                  struct sockaddr in_addr;
                  socklen_t in_len;
                  int infd;
                  char hbuf[NI_MAXHOST], sbuf[NI_MAXSERV];

                  in_len = sizeof in_addr;
                  infd = accept (events[i].data.fd, &in_addr, &in_len);

                  if (infd == -1)
                    {
                      if ((errno == EAGAIN) ||
                          (errno == EWOULDBLOCK))
                        {
                          /* We have processed all incoming
                             connections. */
                          break;
                        }
                      else
                        {
                          perror ("accept");
                          break;
                        }
                    }

		  if (events[i].data.fd == sfd2) {
			// keep track of the fd from our relay port
			sfd2in = infd;
		  } else {
			// keep track of clients
			client_cur = (client *)malloc(sizeof(client));
			if (!client_cur) {
				fprintf (stderr, "malloc failed\n");
				exit (EXIT_FAILURE);
			}
			client_cur->fd = infd;
			client_cur->next = client_list;
			client_list = client_cur;
			client_count++;
		  }

                  s = getnameinfo (&in_addr, in_len,
                                   hbuf, sizeof hbuf,
                                   sbuf, sizeof sbuf,
                                   NI_NUMERICHOST | NI_NUMERICSERV);
                  if (s == 0)
                    {
                      printf("Accepted connection on descriptor %d "
                             "(host=%s, port=%s)\n", infd, hbuf, sbuf);
                    }

                  /* Make the incoming socket non-blocking and add it to the
                     list of fds to monitor. */
                  s = make_socket_non_blocking (infd);
                  if (s == -1)
                    abort ();

                  event.data.fd = infd;
                  event.events = EPOLLIN | EPOLLET;
                  s = epoll_ctl (efd, EPOLL_CTL_ADD, infd, &event);
                  if (s == -1)
                    {
                      perror ("epoll_ctl");
                      abort ();
                    }
                }
              continue;
            }
          else
            {
              /* We have data on the fd waiting to be read. Read and
                 display it. We must read whatever data is available
                 completely, as we are running in edge-triggered mode
                 and won't get a notification again for the same
                 data. */
              int done = 0;

              while (1)
                {
                  ssize_t count;
                  char buf[8192];

                  count = read (events[i].data.fd, buf, sizeof buf);
                  if (count == -1)
                    {
                      /* If errno == EAGAIN, that means we have read all
                         data. So go back to the main loop. */
                      if (errno != EAGAIN)
                        {
                          perror ("read");
                          done = 1;
                        }
                      break;
                    }
                  else if (count == 0)
                    {
                      /* End of file. The remote has closed the
                         connection. */
                      done = 1;
                      break;
                    }

		// past this point is data waiting to be read

		   if (events[i].data.fd == sfd2in) {

		          /* Data is from relay, write it to all clients and close connections */
	
		   	   clock_start = clock();
			   time(&time_start);

			   for (client_cur = client_list; client_cur != NULL; client_cur=client_cur->next) {
				write(client_cur->fd, buf, count);
				close(client_cur->fd); // monitored by epoll
				free(client_cur);
			   }

			   time(&time_end);
			   clock_elapsed = (double)(clock() - clock_start) / CLOCKS_PER_SEC;
			   time_elapsed = difftime(time_end, time_start);

			   printf("Wrote to %d clients using %f CPU seconds and %f clock seconds\n",
				client_count, clock_elapsed, time_elapsed);
			   client_count=0;
			   client_list = NULL;
		   } else {

			// potentially, we could process headers/GET/cookies now... but no reason to

		   }
                }

              if (done)
                {
		if (events[i].data.fd == sfd2in)
			sfd2in = 0;
		
                  printf ("Closed connection on descriptor %d\n",
                          events[i].data.fd);

                  /* Closing the descriptor will make epoll remove it
                     from the set of descriptors which are monitored. */
                  close (events[i].data.fd);
                }
            }
        }
    }

  printf("Closing open sockets and connections...\n");
  free (events);

//  for (client_cur = client_list; client_cur != NULL; client_cur=client_cur->next)
//	free(client_cur);

  close (sfd);
  close (sfd2);

  return EXIT_SUCCESS;
}
