// 개발용 화면 확인: 시스템 Chrome 을 헤드리스로 띄워 카드를 눌러 보고 화면을 찍는다.
//   node tests/e2e/shots.mjs http://localhost:5199/ <출력폴더>
import { chromium } from 'playwright-core';

const [url, out] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1, locale: 'ko-KR' });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
await page.waitForSelector('#grid .card');
await page.screenshot({ path: `${out}/1-start.png` });

const tapCard = async (label) => page.locator('#grid .card', { hasText: new RegExp(`^${label}$`) }).first().click();
const tapTab = async (label) => page.locator('#tabs .tab', { hasText: label }).first().click();

await tapTab('사람');
await tapCard('할머니');
await tapTab('먹을거리');
await tapCard('밥');
await tapTab('움직임');
await tapCard('먹다');
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/2-halmeoni.png` });
console.log('후보:', await page.locator('#speak .cand .text').allTextContents());

await page.locator('#clear').click();
await tapTab('자주');
await tapCard('엄마');
await tapCard('쉬');
await tapCard('마렵다');
await page.waitForTimeout(200);
console.log('후보:', await page.locator('#speak .cand .text').allTextContents());
await page.screenshot({ path: `${out}/3-eomma.png` });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/4-phone.png` });

await page.setViewportSize({ width: 1180, height: 820 });
await page.locator('#open-settings').click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${out}/5-settings.png` });
console.log('오류:', errors.length ? errors : '없음');
await browser.close();
