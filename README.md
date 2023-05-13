# Unofficial Parades Commission API

This doesn't do too much at the minute. Here's the routes available:

* `/parades` - lists all upcoming parades in the North
* `/parades_by_street_belfast/:street` - List all the upcoming parades by street.

There's query params for `/parades` available as well.

* `?location` - Filter by town or city
* `?start=some_start_date&end=some_end_date` - Specify a start or end. This probably doesn't work yet.

For now, parades by street is Belfast only. I didn't want to bother dealing with
geo APIs to figure out what city or town a street is in, so it just assumes
Belfast.

## Some unfortunate details

To search by street name, we need to visit the details page for each parade in
Belfast to get the list of streets the parade is on. Not really great, so we're
caching this in a Cloudflare KV store.
