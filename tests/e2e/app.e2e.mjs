// 화면 테스트: 빌드한 앱을 띄워 실제 브라우저(시스템 Chrome, 헤드리스)로 눌러 본다.
//   npm run e2e
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 5299;
const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise((resolve) => server.stdout.on('data', (d) => String(d).includes('http') && resolve()));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const results = [];
async function check(name, fn) {
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 음성은 기록만: 테스트에서 실제로 소리 내지 않는다
  await page.addInitScript(() => {
    window.__spoken = [];
    const fake = { speak: (u) => window.__spoken.push(u.text), cancel() {}, getVoices: () => [{ lang: 'ko-KR', localService: true, name: 'test' }], addEventListener() {} };
    Object.defineProperty(window, 'speechSynthesis', { value: fake });
    window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  });
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForSelector('#grid .card');
  try {
    await fn(page);
    assert.deepEqual(errors, [], '페이지 오류 없음');
    results.push(['✓', name]);
  } catch (e) {
    results.push(['✗', name, e.message]);
  } finally {
    await page.close();
  }
}

const card = (page, label) => page.locator('#grid .card', { hasText: new RegExp(`^${label}$`) }).first();
const tab = (page, label) => page.locator('#tabs .tab', { hasText: label }).first();
const cands = (page) => page.locator('#alts .cand .text').allTextContents();
const sayText = (page) => page.locator('#say .text').textContent();

await check('카드를 고르면 문법에 맞는 문장 후보가 나온다', async (page) => {
  await tab(page, '사람').click();
  await card(page, '할머니').click();
  await tab(page, '먹을거리').click();
  await card(page, '밥').click();
  await tab(page, '움직임').click();
  await card(page, '먹다').click();
  const c = await cands(page);
  assert.equal(c[0], '할머니가 진지를 드세요.');
  assert.ok(c.includes('할머니, 진지를 드세요.'));
});

await check('후보를 누르면 그 문장을 소리 내 읽고, 기록에 남는다', async (page) => {
  for (const l of ['엄마', '쉬', '마렵다']) await card(page, l).click();
  await page.locator('#say').click();
  const spoken = await page.evaluate(() => window.__spoken);
  assert.equal(spoken.at(-1), '엄마, 쉬가 마려워요.');
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('hanmadi.log')));
  const speak = log.find((e) => e.type === 'speak');
  assert.equal(speak.rank, 0);
  assert.equal(speak.cards, 3);
  assert.equal(speak.grammar, true);
  assert.ok(!JSON.stringify(log).includes('엄마'), '기록에 낱말 글자가 아니라 카드 id 만');
});

await check('카드를 누르면 낱말을 읽어 준다', async (page) => {
  await card(page, '물').click();
  assert.equal((await page.evaluate(() => window.__spoken)).at(-1), '물');
});

await check('문법 도움을 끄면 기존 AAC 처럼 카드 이름만 읽는다(비교 모드)', async (page) => {
  await page.locator('#open-settings').click();
  await page.locator('input[name=grammar]').uncheck();
  await page.locator('#settings button[value=close]').click();
  for (const l of ['엄마', '쉬', '마렵다']) await card(page, l).click();
  assert.deepEqual(await cands(page), ['엄마 쉬 마렵다']);
});

await check('반말로 바꾸면 문장이 반말이 된다', async (page) => {
  await page.locator('#open-settings').click();
  await page.locator('input[name=speech][value=plain]').check();
  await page.locator('#settings button[value=close]').click();
  for (const l of ['나', '먹다', '싶어요']) await card(page, l).click();
  assert.equal((await cands(page))[0], '나는 먹고 싶어.');
});

await check('글을 몰라도: 다르게를 누르면 다음 해석을 작은 소리로 들려주고, 말하기는 그 해석을 말한다', async (page) => {
  await tab(page, '사람').click();
  await card(page, '할머니').click();
  await tab(page, '먹을거리').click();
  await card(page, '밥').click();
  await tab(page, '움직임').click();
  await card(page, '먹다').click();
  assert.equal(await sayText(page), '할머니가 진지를 드세요.');
  assert.equal(await page.locator('#say .cue img').count(), 1, '누구 이야기인지 그림 단서');
  await page.locator('#other').click();
  assert.equal(await sayText(page), '할머니, 진지를 드세요.');
  assert.equal(await page.locator('#say .badge').textContent(), '📣', '부르는 말은 📣 단서');
  assert.equal((await page.evaluate(() => window.__spoken)).at(-1), '할머니, 진지를 드세요.');
  await page.locator('#say').click();
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('hanmadi.log')));
  assert.equal(log.find((e) => e.type === 'speak').rank, 1, '두 번째 해석을 골랐다고 기록');
  assert.equal(log.filter((e) => e.type === 'preview').length, 1);
});

await check('모두 보기를 펼치면 해석 목록에서 바로 고를 수 있다', async (page) => {
  for (const l of ['엄마', '쉬', '마렵다']) await card(page, l).click();
  assert.equal(await page.locator('#alts').isVisible(), false);
  await page.locator('#more').click();
  assert.equal(await page.locator('#alts').isVisible(), true);
  await page.locator('#alts .cand').nth(1).click();
  assert.equal((await page.evaluate(() => window.__spoken)).at(-1), '엄마는 쉬가 마려워요.');
});

await check('칩을 누르면 그 카드만 빠지고, 지우기는 모두 비운다', async (page) => {
  for (const l of ['나', '물', '주세요']) await card(page, l).click();
  await page.locator('#strip .chip').nth(1).click();
  assert.equal(await page.locator('#strip .chip').count(), 2);
  await page.locator('#clear').click();
  assert.equal(await page.locator('#strip .chip').count(), 0);
});

await check('스위치 스캐닝: 스페이스 두 번으로 카드를 고른다', async (page) => {
  await page.locator('#open-settings').click();
  await page.locator('input[name=scanSec]').fill('0.5');
  await page.locator('input[name=scan]').check();
  await page.locator('#settings button[value=close]').click();
  // 묶음(첫 카드 줄)에 강조가 올 때까지 기다렸다가 고르고, 첫 칸에서 다시 고른다
  await page.waitForFunction(() => document.querySelector('#grid .card')?.classList.contains('scan-group'), null, { timeout: 8000 });
  await page.keyboard.press(' ');
  await page.waitForFunction(() => document.querySelector('#grid .card')?.classList.contains('scan-item'), null, { timeout: 4000 });
  await page.keyboard.press(' ');
  assert.equal(await page.locator('#strip .chip').count(), 1);
  assert.equal(await page.locator('#strip .chip span').first().textContent(), '나');
});

await check('과제 모드: 상황을 보여 주고, 말하면 결과를 남기고 다음 과제로', async (page) => {
  await page.locator('#open-settings').click();
  await page.locator('#task-code').fill('P02'); // 짝수 코드: 앞 절반은 문법 켬
  await page.locator('#task-start').click();
  assert.match(await page.locator('#task').textContent(), /과제 1\/12.*물을 달라고/);
  await card(page, '물').click();
  await card(page, '주세요').click();
  assert.equal((await cands(page))[0], '물 주세요.');
  await page.locator('#say').click();
  await page.waitForFunction(() => /과제 2\/12/.test(document.querySelector('#task').textContent), null, { timeout: 4000 });
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('hanmadi.log')));
  const t = log.find((e) => e.type === 'task');
  assert.equal(t.task, 't01');
  assert.equal(t.participant, 'P02');
  assert.equal(t.grammar, true);
  assert.equal(t.match, true);
  assert.equal(t.text, '물 주세요.');
});

await check('과제 모드: 홀수 코드는 문법 끔으로 시작한다(순서 상쇄)', async (page) => {
  await page.locator('#open-settings').click();
  await page.locator('#task-code').fill('P03');
  await page.locator('#task-start').click();
  await card(page, '물').click();
  await card(page, '주세요').click();
  assert.deepEqual(await cands(page), ['물 주세요']);
});

await check('배치: 탭이 카드에 가려지지 않고, 과제 모드가 아니면 과제 줄이 안 보인다', async (page) => {
  for (const l of ['할머니', '밥', '먹다'].slice(0, 1)) await page.locator('#tabs .tab').first().click();
  await card(page, '엄마').click();
  const tabs = await page.locator('#tabs').boundingBox();
  const grid = await page.locator('#grid').boundingBox();
  const speakBox = await page.locator('#speak').boundingBox();
  assert.ok(tabs.height >= 40, `탭 높이 ${tabs.height}`);
  assert.ok(tabs.y + tabs.height <= grid.y + 1, '탭 아래에 카드판');
  assert.ok(speakBox.y + speakBox.height <= tabs.y + 1, '후보 아래에 탭');
  assert.equal(await page.locator('#task').isVisible(), false);
});

await check('대화 상대: 친구 그림을 누르면 반말, 선생님을 누르면 존댓말', async (page) => {
  await page.locator('#partner').click();
  await page.locator('.partner-choice', { hasText: '친구에게' }).click();
  for (const l of ['나', '먹다', '싶어요']) await card(page, l).click();
  assert.equal(await sayText(page), '나는 먹고 싶어.');
  await page.locator('#partner').click();
  await page.locator('.partner-choice', { hasText: '선생님께' }).click();
  assert.equal(await sayText(page), '저는 먹고 싶어요.');
  assert.match(await page.locator('#partner').textContent(), /선생님께/);
});

await check('배운 해석: 다르게로 고른 해석이 다음번엔 먼저 나온다', async (page) => {
  const pick = async () => {
    await tab(page, '사람').click();
    await card(page, '할머니').click();
    await tab(page, '먹을거리').click();
    await card(page, '밥').click();
    await tab(page, '움직임').click();
    await card(page, '먹다').click();
  };
  await pick();
  assert.equal(await sayText(page), '할머니가 진지를 드세요.');
  await page.locator('#other').click();
  await page.locator('#say').click();
  await page.waitForTimeout(1000); // 말한 뒤 비우기
  await pick();
  assert.equal(await sayText(page), '할머니, 진지를 드세요.');
});

await check('원칙 2(글 없이): 아이가 누르는 버튼마다 그림이나 기호가 있다', async (page) => {
  for (const l of ['엄마', '쉬', '마렵다']) await card(page, l).click();
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll('#app button')]
      .filter((b) => b.offsetParent !== null && !b.closest('#alts')) // '모두 보기' 목록은 곁의 어른용
      .filter((b) => !b.querySelector('img') && !/[^\p{Script=Hangul}\s\d.,/·?!~()]/u.test(b.textContent))
      .map((b) => b.textContent.trim()),
  );
  assert.deepEqual(bad, [], `글자만 있는 버튼: ${bad.join(', ')}`);
  for (const t of await page.locator('#tabs .tab').all()) assert.equal(await t.locator('img').count(), 1);
});

await check('원칙 3(손이 기억하게): 쓰고, 배우고, 가려도 다른 카드 자리가 그대로', async (page) => {
  const layout = () => page.$$eval('#grid .card', (els) => els.map((e) => (e.classList.contains('gap') ? '·' : e.textContent)));
  const before = await layout();
  for (const l of ['엄마', '쉬', '마렵다']) await card(page, l).click();
  await page.locator('#other').click();
  await page.locator('#say').click();
  await page.waitForTimeout(1000);
  assert.deepEqual(await layout(), before, '말하고 배운 뒤');
  await page.locator('#open-settings').click();
  await page.locator('#edit-board').click();
  await card(page, '엄마').click();
  await page.locator('#edit-done').click();
  const masked = await layout();
  assert.equal(masked.length, before.length, '가린 카드는 빈칸으로 남는다');
  assert.deepEqual(masked, before.map((x) => (x === '엄마' ? '·' : x)));
});

await check('원칙 4(덜 누르게): 물 주세요 3번, 화장실에 가고 싶어요 4번', async (page) => {
  let taps = 0;
  const tap = async (l) => (await card(page, l).click(), taps++);
  await tap('물');
  await tap('주세요');
  await page.locator('#say').click();
  taps++;
  assert.equal((await page.evaluate(() => window.__spoken)).at(-1), '물 주세요.');
  assert.ok(taps <= 3, `물 주세요 ${taps}번`);
  await page.waitForTimeout(1000);
  taps = 0;
  await tap('화장실');
  await tap('가다');
  await tap('싶어요');
  await page.locator('#say').click();
  taps++;
  assert.equal((await page.evaluate(() => window.__spoken)).at(-1), '화장실에 가고 싶어요.');
  assert.ok(taps <= 4, `화장실 ${taps}번`);
});

await check('시작 판: 탭을 오가지 않고 일상 문장이 모두 된다(6칸 고정)', async (page) => {
  const cols = await page.$eval('#grid', (g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
  assert.equal(cols, 6);
  const cases = [
    [['물', '주세요'], '물 주세요.'],
    [['화장실', '가다', '싶어요'], '화장실에 가고 싶어요.'],
    [['엄마', '쉬', '마렵다'], '엄마, 쉬가 마려워요.'],
    [['밥', '더', '주세요'], '밥 더 주세요.'],
    [['그만', '하다', '싶어요'], '그만 하고 싶어요.'],
    [['선생님', '도와주세요'], '선생님, 도와주세요.'],
    [['아프다'], '아파요.'],
    [['나', '도', '놀다', '싶어요'], '저도 놀고 싶어요.'],
    [['이거', '싫다'], '이게 싫어요.'],
  ];
  for (const [labels, want] of cases) {
    for (const l of labels) await card(page, l).click();
    assert.equal(await sayText(page), want, labels.join('+'));
    await page.locator('#clear').click();
  }
  assert.equal(await page.locator('#tabs .tab.on').textContent(), '시작', '탭을 바꾸지 않았다');
});

await check('품사 색은 기본이 테두리, 설정에서 배경으로 바꿀 수 있다', async (page) => {
  const bg = () => page.$eval('#grid .card', (c) => getComputedStyle(c).backgroundColor);
  assert.equal(await bg(), 'rgb(255, 255, 255)');
  await page.locator('#open-settings').click();
  await page.locator('input[name=colorStyle][value=background]').check();
  await page.locator('#settings button[value=close]').click();
  assert.notEqual(await bg(), 'rgb(255, 255, 255)');
});

await check('휴대폰 너비에서 가로 넘침이 없다', async (page) => {
  await page.setViewportSize({ width: 360, height: 780 });
  for (const l of ['엄마', '쉬', '마렵다']) await card(page, l).click();
  assert.ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 360);
});

await browser.close();
server.kill();
for (const r of results) console.log(r.join('  '));
const failed = results.filter((r) => r[0] === '✗').length;
console.log(`${results.length - failed}/${results.length} 통과`);
process.exit(failed ? 1 : 0);
