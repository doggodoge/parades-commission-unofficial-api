import { Router } from 'itty-router';
import { allParades, parseParadesDetailsHTML } from './parser';

const router = Router();

// Levenshtein distance function for fuzzy matching
function levenshteinDistance(str1, str2) {
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

// Fuzzy match function that checks if street name is similar enough
function fuzzyMatchStreet(searchTerm, streetText, threshold = 2) {
  const searchLower = searchTerm.toLowerCase();
  const streetLower = streetText.toLowerCase();
  
  // Direct substring match (current behavior)
  if (streetLower.includes(searchLower)) {
    return true;
  }
  
  // Split route into individual words/street names
  const words = streetText.toLowerCase().split(/[,\s]+/).filter(word => word.length > 2);
  
  // Check fuzzy match against each word
  for (const word of words) {
    const distance = levenshteinDistance(searchLower, word);
    const maxLength = Math.max(searchLower.length, word.length);
    
    // Allow distance based on word length, but cap at threshold
    const allowedDistance = Math.min(threshold, Math.floor(maxLength * 0.3));
    
    if (distance <= allowedDistance) {
      return true;
    }
  }
  
  return false;
}

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

router.get('/parades', async ({ query }, env) => {
  const { location, start, end } = query;
  
  // 10 minutes TTL in seconds
  const PARADES_TTL_SECONDS = 10 * 60;
  const PARADES_CACHE_KEY = 'all_parades';
  
  // Check cache first
  let parades;
  const cachedParades = await env.PARADE_DETAILS.get(PARADES_CACHE_KEY);
  if (cachedParades) {
    parades = JSON.parse(cachedParades);
  } else {
    // Fetch fresh data and cache it
    parades = await allParades();
    await env.PARADE_DETAILS.put(
      PARADES_CACHE_KEY, 
      JSON.stringify(parades), 
      { expirationTtl: PARADES_TTL_SECONDS }
    );
  }
  
  // Apply filters
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

  const TTL_SECONDS = 14 * 24 * 60 * 60;

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
          env.PARADE_DETAILS.put(url, JSON.stringify(parsedParadeDetails), {
            expirationTtl: TTL_SECONDS,
          });
          return parsedParadeDetails;
        });
    }),
  );

  const paradesOnStreet = parsedParadeDetails.filter(
    (parade) =>
      typeof parade.proposedOutwardRoute === 'string' &&
      fuzzyMatchStreet(street, parade.proposedOutwardRoute),
  );

  return new Response(JSON.stringify(paradesOnStreet), {
    headers: { 'Content-Type': 'application/json' },
  });
});

router.all('*', () => new Response('404, not found!'));

export default {
  fetch: (request, env, context) => router.handle(request, env, context),
};
