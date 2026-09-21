// 해석 순위 개인화: 아이가 고른 해석의 '모양'을 기억해 다음에 비슷한 카드 조합이 오면 그 모양을 위로 올린다.
//
// 원칙: 후보를 더하거나 빼지 않고 순서만 바꾼다(뜻은 아이의 것). 카드 위치는 배우지 않는다(손이 기억하게).
// 세 층으로 기억한다.
//   exact    같은 카드 조합([엄마][쉬][마렵다])에서 고른 해석
//   general  같은 종류 조합([사람][몸][느낌 서술어])에서 고른 해석 → [엄마][배][아프다]에도 번진다
//   habit    사람·나를 어떻게 다루는지만(부르나, 주어를 빼나) → [나][학교][가다]에서 뺀 습관이 [나][밥][먹다]로 번진다
import type { Entry } from './lexicon';
import type { Candidate, Card } from './realize';

export interface Prefs {
  exact: Record<string, Record<string, number>>;
  general: Record<string, Record<string, number>>;
  habit: Record<string, Record<string, number>>;
}

export function emptyPrefs(): Prefs {
  return { exact: {}, general: {}, habit: {} };
}

type Level = 'exact' | 'general' | 'habit';
const LEVELS: Level[] = ['exact', 'general', 'habit'];
const ANIMATE = new Set(['self', 'you', 'we', 'person', 'animal']);

/** habit 층은 사람·나 카드만 본다 */
function counts(e: Entry, level: Level): boolean {
  return level !== 'habit' || (e.kind === 'noun' && ANIMATE.has(e.cat)) || e.kind === 'pred';
}

function keyOf(e: Entry, level: Level): string {
  if (level === 'exact') return e.id;
  if (level === 'habit') {
    if (e.kind === 'noun') return e.cat === 'animal' ? 'n:person' : `n:${e.cat}`;
    if (e.kind === 'pred') return 'p';
  }
  switch (e.kind) {
    case 'noun':
      return e.wh ? `wh:${e.word}` : `n:${e.cat}`;
    case 'pred': {
      const has = (r: string) => e.frame.some((s) => s.role === r);
      // 서술어 종류: 하는 일 / 있음 / 느낌(마렵다·아프다) / 성질(크다·맛있다)
      const kind = has('agent') ? (e.pos === 'verb' ? 'act' : 'exist') : has('experiencer') ? 'feel' : 'prop';
      return `p:${kind}`;
    }
    default:
      return `${e.kind}:${e.id}`; // 기능 카드는 그 자체로
  }
}

function patternOf(cards: Card[], level: Level): string {
  return cards
    .filter((c) => counts(c.entry, level))
    .map((c) => keyOf(c.entry, level))
    .sort()
    .join(' ');
}

/** 해석의 모양: 카드마다 어떤 역할로 쓰였는지 + 서법. 말투·낱말 모양이 달라도 같은 해석이면 같은 모양 */
export function shapeOf(c: Candidate, cards: Card[], level: Level): string {
  const byKey = new Map(cards.map((x) => [x.key, x.entry]));
  const parts: string[] = [];
  for (const t of c.tokens) {
    for (const k of t.sources) {
      const e = byKey.get(k);
      if (!e || !counts(e, level)) continue;
      // habit 층의 서술어는 역할이 늘 predicate 라 서법만 남긴다
      if (level === 'habit' && e.kind === 'pred') continue;
      parts.push(`${keyOf(e, level)}=${t.role ?? '-'}${t.text ? '' : '(생략)'}`);
    }
  }
  return `${parts.sort().join(',')}|${c.features.mood}`;
}

const W: Record<Level, number> = { exact: 3, general: 1.5, habit: 2 };

/** 기억한 선호로 순서만 바꾼다. 처음 보는 조합이면 원래 순서 그대로 */
export function rerank(cands: Candidate[], cards: Card[], prefs: Prefs): Candidate[] {
  const bonus = (c: Candidate) =>
    LEVELS.reduce((sum, level) => {
      const seen = prefs[level]?.[patternOf(cards, level)];
      if (!seen) return sum;
      const total = Object.values(seen).reduce((a, b) => a + b, 0);
      return sum + (W[level] * (seen[shapeOf(c, cards, level)] ?? 0)) / total;
    }, 0);
  return cands
    .map((c, i) => ({ c, i, s: c.score + bonus(c) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.c);
}

/** 아이가 이 해석을 골랐다 */
export function learn(prefs: Prefs, chosen: Candidate, cards: Card[]): Prefs {
  const next: Prefs = { exact: { ...prefs.exact }, general: { ...prefs.general }, habit: { ...(prefs.habit ?? {}) } };
  for (const level of LEVELS) {
    const p = patternOf(cards, level);
    const tally = { ...(next[level][p] ?? {}) };
    const s = shapeOf(chosen, cards, level);
    tally[s] = (tally[s] ?? 0) + 1;
    next[level][p] = tally;
  }
  return next;
}
