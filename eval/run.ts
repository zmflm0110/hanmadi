// 평가 항목(카드열)을 엔진에 넣어 후보 문장을 기록한다.  npx tsx eval/run.ts data/tatoeba-items.jsonl data/tatoeba-preds.jsonl
import { readFileSync, writeFileSync } from 'node:fs';
import { entry } from '../src/data/core';
import type { Speech } from '../src/engine/predicate';
import { realize } from '../src/engine/realize';

const [src, dst] = process.argv.slice(2);
const lines = readFileSync(src!, 'utf8').trim().split('\n');
const out: string[] = [];
const t0 = performance.now();
for (const line of lines) {
  const item = JSON.parse(line) as { id: string; text: string; speech: Speech; honorListener?: boolean; cards: string[] };
  const cards = item.cards.map((id, i) => ({ key: `${id}#${i}`, entry: entry(id) }));
  const cands = realize(cards, { speech: item.speech, honorListener: item.honorListener }, 5);
  out.push(JSON.stringify({ ...item, preds: cands.map((c) => c.text), unused: cands[0]?.unused ?? [] }));
}
const ms = (performance.now() - t0) / lines.length;
writeFileSync(dst!, out.join('\n') + '\n');
console.log(`${lines.length}개 항목, 문장당 ${ms.toFixed(2)}ms`);
