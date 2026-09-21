// 평가 항목(카드열)을 엔진에 넣어 후보 문장을 기록한다.  npx tsx eval/run.ts data/tatoeba-items.jsonl data/tatoeba-preds.jsonl
import { readFileSync, writeFileSync } from 'node:fs';
import { entry } from '../src/data/core';
import type { Speech } from '../src/engine/predicate';
import { realize } from '../src/engine/realize';

// --shuffle <seed>: 내용 카드 순서를 섞어 넣는다(사용자가 순서를 뒤섞어 눌러도 되는지)
const args = process.argv.slice(2);
const [src, dst] = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--shuffle');
const seedArg = args.indexOf('--shuffle');
let seed = seedArg >= 0 ? Number(args[seedArg + 1]) : 0;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
const lines = readFileSync(src!, 'utf8').trim().split('\n');
const out: string[] = [];
const t0 = performance.now();
for (const line of lines) {
  const item = JSON.parse(line) as { id: string; text: string; speech: Speech; honorListener?: boolean; cards: string[] };
  const ids = seedArg >= 0 ? shuffle(item.cards) : item.cards;
  const cards = ids.map((id, i) => ({ key: `${id}#${i}`, entry: entry(id) }));
  const cands = realize(cards, { speech: item.speech, honorListener: item.honorListener }, 5);
  out.push(JSON.stringify({ ...item, shuffled: ids, preds: cands.map((c) => c.text), unused: cands[0]?.unused ?? [] }));
}
const ms = (performance.now() - t0) / lines.length;
writeFileSync(dst!, out.join('\n') + '\n');
console.log(`${lines.length}개 항목, 문장당 ${ms.toFixed(2)}ms`);
