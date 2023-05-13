import { Router } from 'itty-router';
import { allParades, parseParadesDetailsHTML } from './parser';

const router = Router();

const rootMessage = `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width">
	<meta name="description" content="Unofficial API for the NI Parades Commission">
	<title>Unofficial NI Parades Commission API</title>
	<style>
		:root {
			font-family: sans-serif;
		}

		code {
			background-color: #eee;
			padding: 0.2em;
			border-radius: 0.2em;
			box-shadow: 0 0 0.2em #aaa;
		}

		li {
			margin-bottom: 0.5em;
		}
	</style>
</head>
<body>
	<h1>Welcome to the NI Parades Commission Unofficial API</h1>

	<p>
		This is not an official API, and is not affiliated with the Parades Commission
		in any way. It's just a fun little project to make the data more accessible.
	</p>

	<p>
		I'd give you a swagger page, but it's more effort than it's worth for an API
		served from a cloudflare worker, so here's a list of the routes instead:
	</p>

	<ul>
		<li><code>/</code> - this message</li>
		<li><code>/parades</code> - list all parades</li>
		<li><code>/parades_by_street_belfast/:street</code> - list all parades that go down a given street in Belfast</li>
	</ul>
	</body>
</html>
`;

router.get(
  '/',
  () =>
    new Response(rootMessage, {
      headers: { 'content-type': 'text/html' },
    }),
);

router.get('/parades', async ({ query }) => {
  const { location, start, end } = query;
  let parades = await allParades();
  if (location) {
    parades = parades.filter(
      (p) => p.town.toLowerCase() === location.toLowerCase(),
    );
  }
  if (start && end) {
    parades = parades.filter((p) => p.date >= start && p.date <= end);
  }
  return new Response(JSON.stringify(parades), {
    headers: { 'Content-Type': 'application/json' },
  });
});

router.get('/parades_by_street_belfast/:street', async ({ params }, env) => {
  const street = decodeURIComponent(params.street);
  const parades = await allParades();

  const paradeURLs = parades
    .filter((p) => p.town.toLowerCase() === 'belfast')
    .map((p) => p.detailsUrl);

  const parsedParadeDetails = await Promise.all(
    paradeURLs.map(async (url) => {
      const kvEntry = await env.PARADE_DETAILS.get(url);
      if (kvEntry) {
        return JSON.parse(kvEntry);
      }
      return fetch(url)
        .then((res) => res.text())
        .then((html) => {
          const parsedParadeDetails = parseParadesDetailsHTML(html);
          env.PARADE_DETAILS.put(url, JSON.stringify(parsedParadeDetails));
          return parsedParadeDetails;
        });
    }),
  );

  const paradesOnStreet = parsedParadeDetails.filter(
    (parade) =>
      typeof parade.proposedOutwardRoute === 'string' &&
      parade.proposedOutwardRoute.toLowerCase().includes(street.toLowerCase()),
  );

  return new Response(JSON.stringify(paradesOnStreet), {
    headers: { 'Content-Type': 'application/json' },
  });
});

router.all('*', () => new Response('404, not found!'));

export default {
  fetch: (request, env, context) => router.handle(request, env, context),
};
