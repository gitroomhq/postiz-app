const process = require('process')
process.chdir(__dirname);
const {writeFileSync, renameSync, rmdirSync, mkdirSync} = require("fs");
const { config } = require('dotenv');
const prod = require('./mint.js').default;
config();
(async () => {
  const {generateOpenApiPages} = await import("@mintlify/scraping");

  try {
    rmdirSync('./api-reference/custom', { recursive: true });
    rmdirSync('./public-api-reference/custom', { recursive: true });
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (e) {
  }

  await generateOpenApiPages(process.env.BACKEND_URL + '/docs-json', true, 'api-reference/custom');
  const generate = await generateOpenApiPages(process.env.BACKEND_URL + '/docs-json');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  mkdirSync('./public-api-reference/custom', { recursive: true });
  renameSync('./api-reference/custom/public', './public-api-reference/custom/public/');

  prod.navigation.push(...generate.nav.map((item) => ({
    ...item,
    pages: item.pages.map((page) => (page.indexOf('public') >  -1 ? 'public-api-reference/custom/' : 'api-reference/custom/') + page)
  })));

  writeFileSync('./mint.json', JSON.stringify(prod, null, 2));
  const text = await (await fetch(process.env.BACKEND_URL + '/docs-json')).text();
  writeFileSync('./openapi.json', text);
})();
