import * as cheerio from 'cheerio';

async function fetchHtml(url) {
  return fetch(url).then((res) => res.text());
}

function parseParadesHTML(html) {
  const $ = cheerio.load(html);
  const table = $('table.HomePageTable');
  const rows = table.find('tr');
  const parades = [];
  rows.each((i, row) => {
    const cells = $(row).find('td');
    if (cells.length === 0) {
      return;
    }
    const parade = {
      date: cells.eq(0).text(),
      parade: cells.eq(1).text(),
      town: cells.eq(2).text(),
      startTime: cells.eq(3).text(),
      determination: cells.eq(4).text(),
      detailsUrl: `https://www.paradescommission.org${cells.eq(1).find('a').attr('href')}`,
    };
    parades.push(parade);
  });
  return parades;
}

function parseParadesDetailsHTML(html) {
  const $ = cheerio.load(html);
  const table = $('table.HomePageTable');
  const secondColumn = table.find('td:nth-child(2)');
  // Helper function to extract street names as an array
  const getRouteArray = (element) => {
    // Get HTML content and split by <br> tags to get individual streets
    const html = element.html();
    if (!html || html.trim() === '' || html.trim() === '-') {
      return [];
    }
    
    return html
      .split(/<br\s*\/?>/i)          // Split on <br> tags
      .map(street => street.replace(/<[^>]*>/g, '').trim()) // Clean each street name
      .filter(street => street.length > 0 && street !== '-'); // Remove empty strings and dashes
  };

  // Helper function to extract bands as an array
  const getBandsArray = (element) => {
    const text = element.text().trim();
    if (!text || text === '-') {
      return [];
    }
    
    return text
      .split(',')                    // Split on commas
      .map(band => band.trim())      // Clean each band name
      .filter(band => band.length > 0 && band !== '-'); // Remove empty strings and dashes
  };

  const parade = {
    dateOfParade: secondColumn.eq(1).text().trim(),
    startTimeOfOutwardRoute: secondColumn.eq(2).text().trim().replace(/(\d+)\.:(\d+)/g, '$1:$2'),
    proposedOutwardRoute: getRouteArray(secondColumn.eq(3)),
    endTimeOfOutwardRoute: secondColumn.eq(4).text().trim().replace(/(\d+)\.:(\d+)/g, '$1:$2'),
    startTimeOfReturnRoute: secondColumn.eq(5).text().trim(),
    proposedReturnRoute: getRouteArray(secondColumn.eq(6)),
    endTimeOfReturnRoute: secondColumn.eq(7).text().trim(),
    numberOfBands: secondColumn.eq(8).text().trim(),
    bands: getBandsArray(secondColumn.eq(9)),
    numberOfParticipants: secondColumn.eq(10).text().trim(),
    numberOfSupporters: secondColumn.eq(11).text().trim(),
  };
  return parade;
}

async function allParades() {
  return fetchHtml('https://www.paradescommission.org/home.aspx').then(
    parseParadesHTML,
  );
}

export { parseParadesDetailsHTML, allParades };
