// 개인화 흉내: 사람 문장을 한 사람이 차례로 말한 것처럼 넣고, 매번 순위를 매긴 뒤 원문 해석을 '고른 것'으로 배운다.
//   npx tsx eval/learning_sim.ts eval/data/gold-dev.jsonl [seeds=5]
import { readFileSync } from 'node:fs';
import { entry } from '../src/data/core';
import { emptyPrefs, learn, rerank } from '../src/engine/prefer';
import type { Speech } from '../src/engine/predicate';
import { realize } from '../src/engine/realize';

interface Row { id: string; text: string; speech: Speech; honorListener?: boolean; cards: string[]; gold: string | null }
const [src, seedsArg] = process.argv.slice(2);
const rows = readFileSync(src!, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row).filter((r) => r.gold);
const seeds = Number(seedsArg ?? 5);

function shuffled<T>(xs: T[], seed: number): T[] {
  const a = [...xs];
  let s = seed;
  const rand = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

let base1 = 0, learn1 = 0, total = 0;
const halves = { first: { b: 0, l: 0, n: 0 }, second: { b: 0, l: 0, n: 0 } };
for (let seed = 1; seed <= seeds; seed++) {
  let prefs = emptyPrefs();
  const order = shuffled(rows, seed);
  order.forEach((r, i) => {
    const cards = r.cards.map((id, k) => ({ key: `${id}#${k}`, entry: entry(id) }));
    const cands = realize(cards, { speech: r.speech, honorListener: r.honorListener }, 5);
    const ranked = rerank(cands, cards, prefs);
    const b = cands[0]?.text === r.gold ? 1 : 0;
    const l = ranked[0]?.text === r.gold ? 1 : 0;
    base1 += b; learn1 += l; total++;
    const h = i < order.length / 2 ? halves.first : halves.second;
    h.b += b; h.l += l; h.n++;
    const chosen = cands.find((c) => c.text === r.gold);
    if (chosen) prefs = learn(prefs, chosen, cards); // 아이가 이 해석을 골랐다
  });
}
const pct = (a: number, n: number) => `${((100 * a) / n).toFixed(1)}%`;
console.log(`항목 ${rows.length}개(원문이 후보에 있는 것) × 순서 ${seeds}가지`);
console.log(`1순위 적중  배우지 않음 ${pct(base1, total)}  →  배우며 사용 ${pct(learn1, total)}`);
console.log(`  앞 절반  ${pct(halves.first.b, halves.first.n)} → ${pct(halves.first.l, halves.first.n)}`);
console.log(`  뒤 절반  ${pct(halves.second.b, halves.second.n)} → ${pct(halves.second.l, halves.second.n)}`);
