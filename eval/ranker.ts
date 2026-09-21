// 순위 학습 실험용 특징(앱에는 쓰지 않는다: 교차 검증에서 규칙 대비 이득 없음, eval/RESULTS.md)
// 학습된 순위: 후보의 '모양' 특징에 가중치를 곱해 순서를 다시 매긴다. 후보를 만들지는 않는다(순서만).
// 특징은 말맛 선택을 드러낸다: 부르는 말인가, 주어를 뺐나, 은/는인가 이/가인가, 이다 문장인가 …
import type { Candidate, Card } from '../src/engine/realize';

export const FEATURE_NAMES = [
  'engine_score', // 엔진 규칙 점수(후보 안에서 최고와의 차이)
  'rank0',
  'rank1',
  'vocative',
  'vocative_plain',
  'omit_subject',
  'topic_subject', // 은/는
  'case_subject', // 이/가
  'pronoun_topic', // 저는/나는
  'time_first',
  'copula',
  'fragment',
  'seq_link', // -고 로 이은 두 동사
  'companion_role',
  'recipient_role',
  'theme_role',
  'location_role',
  'instrument_role',
  'question',
  'n_tokens',
] as const;

const SUBJECT = new Set(['agent', 'experiencer']);

export function features(c: Candidate, all: Candidate[], cards: Card[]): number[] {
  const byKey = new Map(cards.map((x) => [x.key, x.entry]));
  const idx = all.indexOf(c);
  const best = Math.max(...all.map((x) => x.score));
  const subj = c.tokens.find((t) => t.role && SUBJECT.has(t.role as string));
  const subjText = subj?.text ?? '';
  const subjEntry = subj ? byKey.get(subj.sources[0]!) : undefined;
  const isPronoun = subjEntry?.kind === 'noun' && ['self', 'we', 'you'].includes(subjEntry.cat);
  const plain = c.features.speech === 'plain';
  const has = (role: string) => (c.tokens.some((t) => t.role === role) ? 1 : 0);
  const vocative = c.tokens[0]?.role === 'vocative' ? 1 : 0;
  return [
    Math.max(-4, c.score - best) / 4,
    idx === 0 ? 1 : 0,
    idx === 1 ? 1 : 0,
    vocative,
    vocative && plain ? 1 : 0,
    subj && subjText === '' ? 1 : 0,
    /[은는]$/.test(subjText) ? 1 : 0,
    /[이가께서]$/.test(subjText) || /^(내가|제가|네가|누가)$/.test(subjText) ? 1 : 0,
    isPronoun && /[은는]$/.test(subjText) ? 1 : 0,
    c.tokens.find((t) => t.text)?.role === 'time' ? 1 : 0,
    c.note === '무엇인지 말하기' || (c.tokens.at(-1)?.role === 'predicate' && /(이에요|예요|이야|야|입니다)[.?]?$/.test(c.text)) ? 1 : 0,
    c.tokens.some((t) => t.role === 'fragment') ? 1 : 0,
    c.tokens.filter((t) => t.role === 'predicate').length > 1 && /고 /.test(c.text) ? 1 : 0,
    has('companion'),
    has('recipient'),
    has('theme'),
    has('location'),
    has('instrument'),
    c.text.endsWith('?') ? 1 : 0,
    Math.min(8, c.tokens.filter((t) => t.text).length) / 8,
  ];
}

export interface RankerModel {
  features: readonly string[];
  weights: number[];
}

/** 학습된 가중치로 순서만 바꾼다 */
export function rerankLearned(cands: Candidate[], cards: Card[], model: RankerModel): Candidate[] {
  if (model.features.join() !== FEATURE_NAMES.join()) return cands; // 특징이 바뀌었으면 옛 모델은 쓰지 않는다
  const scored = cands.map((c, i) => ({ c, i, s: features(c, cands, cards).reduce((sum, v, k) => sum + v * model.weights[k]!, 0) }));
  return scored.sort((a, b) => b.s - a.s || a.i - b.i).map((x) => x.c);
}
