// README 용 화면 캡처.  node tests/e2e/readme-shots.mjs http://localhost:5199/
import { chromium } from 'playwright-core';
const url = process.argv[2];
const b = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const card = (p, l) => p.locator('#grid .card', { hasText: new RegExp(`^${l}$`) }).first();
const tab = (p, l) => p.locator('#tabs .tab', { hasText: l }).first();

const tablet = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
await tablet.goto(url);
await tablet.waitForSelector('#grid .card');
await tab(tablet, '사람').click();
await card(tablet, '할머니').click();
await tab(tablet, '먹을거리').click();
await card(tablet, '밥').click();
await tab(tablet, '움직임').click();
await card(tablet, '먹다').click();
await tablet.waitForTimeout(300);
await tablet.screenshot({ path: 'docs/img/tablet.png' });

const phone = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await phone.goto(url);
await phone.waitForSelector('#grid .card');
for (const l of ['엄마', '쉬', '마렵다']) await card(phone, l).click();
await phone.evaluate(() => document.querySelector('#grid').scrollTo(0, 0));
await phone.waitForTimeout(300);
await phone.screenshot({ path: 'docs/img/phone.png' });
await b.close();
console.log('docs/img/tablet.png, docs/img/phone.png');
