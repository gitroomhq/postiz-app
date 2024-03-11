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
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (e) {
  }

  await generateOpenApiPages('https://api.gitroom.com/docs-json', true, 'api-reference/custom');
  const generate = await generateOpenApiPages('https://api.gitroom.com/docs-json');
  await new Promise((resolve) => setTimeout(resolve, 3000));

  mkdirSync('./api-reference/custom', { recursive: true });

  console.log(generate);

  prod.navigation.push(...generate.nav.map((item) => ({
    ...item,
    pages: item.pages.map((page) => 'api-reference/custom/' + page)
  })));

  console.log(prod);

  writeFileSync('./mint.json', JSON.stringify(prod, null, 2));
  const text = await (await fetch('https://api.gitroom.com/docs-json')).text();
  writeFileSync('./openapi.json', text);
})();
