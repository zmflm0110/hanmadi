// 순위 학습 실험: 후보의 모양 특징으로 쌍 비교 로지스틱 회귀를 학습해, 손으로 정한 순위보다 나은지 본다.
//   npx tsx eval/rank_learn.ts eval/data/gold-dev-tatoeba.jsonl eval/data/gold-dev-chatbot.jsonl [--export src/data/ranker.json]
//
// 후보를 만드는 건 여전히 엔진이다(뜻은 아이의 것). 학습은 순서만 바꾼다.
// 5겹 교차 검증으로 개발용 안에서 일반화를 먼저 확인한다. 시험용은 채택 여부를 정할 때 한 번만 본다.
import { readFileSync, writeFileSync } from 'node:fs';
import { entry } from '../src/data/core';
import type { Speech } from '../src/engine/predicate';
import { features as featuresOf, FEATURE_NAMES } from './ranker';
import { realize, type Candidate, type Card } from '../src/engine/realize';

interface Row { id: string; text: string; speech: Speech; honorListener?: boolean; cards: string[]; gold: string | null }
const args = process.argv.slice(2);
const exportAt = args.indexOf('--export');
const files = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--export');
const rows: Row[] = files.flatMap((f) => readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Row));

interface Item { cands: Candidate[]; cards: Card[]; gold: number }
const items: Item[] = [];
let noGold = 0;
for (const r of rows) {
  const cards = r.cards.map((id, k) => ({ key: `${id}#${k}`, entry: entry(id) }));
  const cands = realize(cards, { speech: r.speech, honorListener: r.honorListener }, 5);
  const gold = cands.findIndex((c) => c.text === r.gold);
  if (gold < 0) {
    noGold++;
    continue;
  }
  items.push({ cands, cards, gold });
}

const D = FEATURE_NAMES.length;
function train(data: Item[], epochs = 200, lr = 0.05, l2 = 0.01): number[] {
  const w = new Array(D).fill(0);
  for (let ep = 0; ep < epochs; ep++) {
    for (const it of data) {
      const xg = featuresOf(it.cands[it.gold]!, it.cands, it.cards);
      it.cands.forEach((c, i) => {
        if (i === it.gold) return;
        const xo = featuresOf(c, it.cands, it.cards);
        const diff = xg.map((v, k) => v - xo[k]!);
        const z = diff.reduce((s, v, k) => s + v * w[k]!, 0);
        const g = 1 / (1 + Math.exp(z)); // d/dz of -log sigmoid(z)
        for (let k = 0; k < D; k++) w[k] = w[k]! + lr * (g * diff[k]! - l2 * w[k]!);
      });
    }
  }
  return w;
}

function top1(data: Item[], w: number[] | null): number {
  let hit = 0;
  for (const it of data) {
    if (!w) {
      if (it.gold === 0) hit++;
      continue;
    }
    const scores = it.cands.map((c) => featuresOf(c, it.cands, it.cards).reduce((s, v, k) => s + v * w[k]!, 0));
    const best = scores.indexOf(Math.max(...scores));
    if (best === it.gold) hit++;
  }
  return hit;
}

// 5겹 교차 검증(순서를 고정한 채 나눔)
const K = 5;
let base = 0, learned = 0;
for (let k = 0; k < K; k++) {
  const testFold = items.filter((_, i) => i % K === k);
  const trainFold = items.filter((_, i) => i % K !== k);
  const w = train(trainFold);
  base += top1(testFold, null);
  learned += top1(testFold, w);
}
const pct = (x: number) => `${((100 * x) / items.length).toFixed(1)}%`;
console.log(`원문이 후보에 있는 항목 ${items.length}개 (없는 항목 ${noGold}개는 순서로 못 고친다)`);
console.log(`5겹 교차 검증 1순위: 규칙 ${pct(base)} → 학습 ${pct(learned)}`);

const w = train(items);
console.log('가중치(큰 것부터):');
for (const [name, v] of FEATURE_NAMES.map((n, i) => [n, w[i]!] as const).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 12)) console.log(`  ${name.padEnd(22)} ${v.toFixed(2)}`);
if (exportAt >= 0) {
  writeFileSync(args[exportAt + 1]!, JSON.stringify({ features: FEATURE_NAMES, weights: w.map((v) => +v.toFixed(4)) }, null, 1));
  console.log(`→ ${args[exportAt + 1]}`);
}
