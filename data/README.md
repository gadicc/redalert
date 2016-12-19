# redalert-data

**Redalert core & generated data**

Copyright (c) 2014-2016 by Gadi Cohen <dragon@wastelands.net>, released under
the MIT license (see [LICENSE.txt](./LICENSE.txt)).  This directory includes
publicly sourced material without copyright which is excluded from the package's
copyright.

## Prerequisite reading

As this data is generated for consumption by the
[RedAlert API](https://github.com/gadicc/redalert/tree/master/api)
should read
[that README.md](https://github.com/gadicc/redalert/blob/master/api/README.md)
first to understand more.

## Usage

You probably just want to use the generated `areas.json` and `locations.json`
files.  There's an API wrapper for common operations with these files as part
of the RedAlert API, mentioned above.

## Generating the data

If you'd like to be involved in the development of this project, the directory
includes the code to build the `areas.json` and `locations.json` files from
scratch.

```bash
$ yarn install
$ yarn start
```
