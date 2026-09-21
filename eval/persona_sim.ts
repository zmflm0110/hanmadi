// 말 습관이 다른 가상의 아이 셋이 앱을 쓰는 흉내: 쓸수록 1순위가 그 아이의 습관에 맞춰지나?
//   npx tsx eval/persona_sim.ts
//
// 조합은 [사람][명사][서술어], [나][명사][서술어] 꼴로 만든다. 같은 조합을 세 번 되풀이하지 않고,
// 한 바퀴(라운드)마다 모든 조합을 섞어 한 번씩 쓴다. 1라운드는 대부분 처음 보는 조합이라 '번지는' 학습을 본다.
import { entry } from '../src/data/core';
import { emptyPrefs, learn, rerank } from '../src/engine/prefer';
import { realize, type Candidate } from '../src/engine/realize';

const PEOPLE = ['eomma', 'appa', 'seonsaengnim', 'halmeoni', 'chingu'];
const OBJ_PRED = [
  ['swi', 'maryeopda'], ['bae', 'apeuda'], ['bap', 'meokda'], ['mul', 'masida'], ['hwajangsil', 'gada'],
  ['gongwon', 'gada'], ['chaek', 'ikda'], ['gong', 'nolda'], ['sagwa', 'jota'], ['tv', 'boda'],
];
const SELF_OBJ_PRED = [
  ['hakgyo', 'gada'], ['bap', 'meokda'], ['sagwa', 'jota'], ['bae', 'apeuda'], ['mul', 'masida'],
  ['chaek', 'ikda'], ['jip', 'gada'], ['gong', 'nolda'], ['tv', 'boda'], ['ppang', 'meokda'],
];

type Seq = string[];
const personSeqs: Seq[] = PEOPLE.flatMap((p) => OBJ_PRED.map(([o, v]) => [p, o!, v!]));
const selfSeqs: Seq[] = SELF_OBJ_PRED.map(([o, v]) => ['na', o!, v!]);

interface Persona {
  name: string;
  seqs: Seq[];
  /** 이 아이가 원하는 해석(없으면 이 조합은 세지 않는다) */
  wants: (cands: Candidate[]) => Candidate | undefined;
}

const PERSONAS: Persona[] = [
  { name: '부르기형 (엄마, 밥을 먹어)', seqs: personSeqs, wants: (cs) => cs.find((c) => c.tokens[0]?.role === 'vocative') },
  {
    name: '이야기형 (엄마가 밥을 먹어)',
    seqs: personSeqs,
    wants: (cs) => cs.find((c) => c.tokens[0]?.role !== 'vocative' && c.tokens.some((t) => (t.role === 'agent' || t.role === 'experiencer') && t.text && t.sources[0]?.startsWith(PEOPLE.find((p) => t.sources[0]!.startsWith(p)) ?? '#'))),
  },
  { name: '생략형 (학교에 가요)', seqs: selfSeqs, wants: (cs) => cs.find((c) => c.tokens.some((t) => t.text === '' && t.sources[0]?.startsWith('na#'))) },
];

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

const ROUNDS = 3;
const SEEDS = 5;
console.log(`조합 수: 사람 ${personSeqs.length}, 나 ${selfSeqs.length} · ${ROUNDS}라운드 · 순서 ${SEEDS}가지 평균`);
console.log('아이(말 습관)                     배우지 않음   1라운드   2라운드   3라운드');
for (const persona of PERSONAS) {
  const hits = Array(ROUNDS).fill(0);
  let base = 0;
  let n = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    let prefs = emptyPrefs();
    for (let round = 0; round < ROUNDS; round++) {
      for (const ids of shuffled(persona.seqs, seed * 100 + round)) {
        const cards = ids.map((id, k) => ({ key: `${id}#${k}`, entry: entry(id) }));
        const cands = realize(cards, { speech: 'plain' }, 5);
        const target = persona.wants(cands);
        if (!target) continue;
        const ranked = rerank(cands, cards, prefs);
        if (ranked[0]?.text === target.text) hits[round]++;
        if (round === 0) {
          n++;
          if (cands[0]?.text === target.text) base++;
        }
        prefs = learn(prefs, target, cards); // 아이가 '다르게'로 찾아 고른 해석
      }
    }
  }
  const pct = (x: number) => `${((100 * x) / n).toFixed(0)}%`.padStart(7);
  console.log(`${persona.name.padEnd(28)}${pct(base)}   ${hits.map(pct).join('   ')}`);
}
