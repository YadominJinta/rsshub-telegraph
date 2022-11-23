import {Telegraf} from 'telegraf';
import RssParser from 'rss-parser';
import {Telegraph} from './telegrah';
import fs from 'fs';
import * as process from 'process';
import proxy from 'node-global-proxy';

interface Config {
  proxy: boolean,
  proxy_url: string,
  author_name: string,
  author_url: string,
  telegraph_token: string,
  bot_token: string,
  rss_urls: string[],
  chat_id: string
}

const config: Config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));

if (config.proxy) {
  proxy.setConfig(config.proxy_url);
  proxy.start();
}

const bot = new Telegraf(config.bot_token);
let lastUpdate: { [index: string]: number } = {};
if (fs.existsSync('lastUpdate.json')) {
  lastUpdate = JSON.parse(fs.readFileSync('lastUpdate.json', 'utf-8'));
}
const rssParser = new RssParser();
const th = new Telegraph(config.telegraph_token, config.author_name, config.author_url);

bot.launch()

const sleep = (ms: number) => new Promise(resolve => {
  setTimeout(resolve, ms)
});

async function fetch_rss() {
  for (; ;) {
    console.log('start fetching rss');
    for (let url of config.rss_urls) {
      try {
        console.log(`fetching url ${url}`);
        const rssResult = await rssParser.parseURL(url);
        console.log(`get ${rssResult.items.length} from ${url}`);
        for (let item of rssResult.items.reverse()) {
          if (!lastUpdate[url] || lastUpdate[url] < Number(new Date(item.pubDate!))) {
            try {
              const createPageResult = await th.createPage(item.title!, item.content!);
              await bot.telegram.sendMessage(config.chat_id, {
                // @ts-ignore
                parse_mode: 'markdown',
                text: `[${createPageResult.title}](${createPageResult.url})`
              });
              console.log(`successfully send link: ${item.link}`);
              await sleep(1000);
            } catch (err) {
              console.log(`failed to create page ${item.link}: ${err}`);
            }
          }
        }
        lastUpdate[url] = Number(new Date());
        fs.writeFileSync('lastUpdate.json', JSON.stringify(lastUpdate));
      } catch (err) {
        console.log(`failed to fetch url ${url}: ${err}`);
      }
    }
    await sleep(1000 * 60 * 5);
  }
}

fetch_rss().then();

process.addListener('exit', () => {
  bot.stop('exit');
  console.log('received sigterm');
  fs.writeFileSync('lastUpdate.json', JSON.stringify(lastUpdate), 'utf-8');
});
