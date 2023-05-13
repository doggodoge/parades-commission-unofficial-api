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
  const parade = {
    dateOfParade: secondColumn.eq(1).text(),
    startTimeOfOutwardRoute: secondColumn.eq(2).text(),
    proposedOutwardRoute: secondColumn.eq(3).text(),
    endTimeOfOutwardRoute: secondColumn.eq(4).text(),
    startTimeOfReturnRoute: secondColumn.eq(5).text(),
    proposedReturnRoute: secondColumn.eq(6).text(),
    endTimeOfReturnRoute: secondColumn.eq(7).text(),
    numberOfBands: secondColumn.eq(8).text(),
    bands: secondColumn.eq(9).text(),
    numberOfParticipants: secondColumn.eq(10).text(),
    numberOfSupporters: secondColumn.eq(11).text(),
  };
  return parade;
}

async function allParades() {
  return fetchHtml('https://www.paradescommission.org/home.aspx').then(
    parseParadesHTML,
  );
}

export { parseParadesDetailsHTML, allParades };
