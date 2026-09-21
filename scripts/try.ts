// 개발용: 카드 id 나열을 받아 문장 후보를 찍는다.  npx tsx scripts/try.ts polite 할머니:halmeoni ...
import { entry } from '../src/data/core';
import { realize } from '../src/engine/realize';
import type { Speech } from '../src/engine/predicate';

const [speech, ...rest] = process.argv.slice(2);
const seqs = rest.join(' ').split('|').map((s) => s.trim().split(/\s+/).filter(Boolean));
for (const ids of seqs) {
  const cards = ids.map((id, i) => ({ key: `${id}#${i}`, entry: entry(id) }));
  const out = realize(cards, { speech: speech as Speech });
  console.log(`[${ids.join(' ')}]`);
  for (const c of out) console.log(`   ${c.score.toFixed(1).padStart(5)}  ${c.text}   (${c.note}${c.unused.length ? ', 못씀:' + c.unused.join(',') : ''})`);
}
