import { describe, expect, it } from 'vitest';
import type { Predicate, Pos } from '../src/engine/conjugate';
import { DEFAULT_FEATURES, realizeCopula, realizePredicate, type Features } from '../src/engine/predicate';

const v = (lemma: string, pos: Pos = 'verb', extra: Partial<Predicate> = {}): Predicate => ({ lemma, pos, ...extra });
const f = (over: Partial<Features> = {}): Features => ({ ...DEFAULT_FEATURES, ...over });

describe('시제 × 말투', () => {
  const cases: [Predicate, Partial<Features>, string][] = [
    [v('가다'), {}, '가요'],
    [v('가다'), { tense: 'past' }, '갔어요'],
    [v('가다'), { tense: 'future' }, '갈 거예요'],
    [v('가다'), { speech: 'plain' }, '가'],
    [v('가다'), { speech: 'plain', tense: 'past' }, '갔어'],
    [v('가다'), { speech: 'plain', tense: 'future' }, '갈 거야'],
    [v('가다'), { speech: 'formal' }, '갑니다'],
    [v('가다'), { speech: 'formal', tense: 'past' }, '갔습니다'],
    [v('가다'), { speech: 'formal', tense: 'future' }, '갈 겁니다'],
    [v('먹다'), {}, '먹어요'],
    [v('먹다'), { speech: 'formal' }, '먹습니다'],
    [v('먹다'), { tense: 'future' }, '먹을 거예요'],
    [v('살다'), { speech: 'formal' }, '삽니다'],
    [v('만들다'), { tense: 'future' }, '만들 거예요'],
    [v('돕다'), {}, '도와요'],
    [v('듣다'), { tense: 'past' }, '들었어요'],
    [v('모르다'), {}, '몰라요'],
    [v('아프다', 'adj'), {}, '아파요'],
    [v('춥다', 'adj'), { tense: 'future' }, '추울 거예요'],
    [v('좋다', 'adj'), { speech: 'plain' }, '좋아'],
    [v('하다'), { tense: 'past' }, '했어요'],
    [v('보다'), {}, '봐요'],
    [v('오다'), { tense: 'past' }, '왔어요'],
    [v('마시다'), {}, '마셔요'],
    [v('쉬다'), {}, '쉬어요'],
  ];
  it.each(cases)('%o %o → %s', (p, over, out) => expect(realizePredicate(p, f(over))).toBe(out));
});

describe('서법', () => {
  const cases: [Predicate, Partial<Features>, string][] = [
    [v('가다'), { mood: 'question' }, '가요?'],
    [v('먹다'), { mood: 'question', tense: 'past' }, '먹었어요?'],
    [v('가다'), { mood: 'question', speech: 'formal' }, '갑니까?'],
    [v('먹다'), { mood: 'question', speech: 'formal' }, '먹습니까?'],
    [v('가다'), { mood: 'suggest', speech: 'plain' }, '가자'],
    [v('놀다'), { mood: 'suggest', speech: 'plain' }, '놀자'],
    [v('가다'), { mood: 'suggest' }, '갈까요?'],
    [v('먹다'), { mood: 'suggest' }, '먹을까요?'],
    [v('가다'), { mood: 'suggest', speech: 'formal' }, '갑시다'],
    [v('앉다'), { mood: 'command' }, '앉으세요'],
    [v('가다'), { mood: 'command' }, '가세요'],
    [v('기다리다'), { mood: 'command' }, '기다리세요'],
    [v('기다리다'), { mood: 'command', speech: 'plain' }, '기다려'],
    [v('앉다'), { mood: 'command', speech: 'formal' }, '앉으십시오'],
    [v('돕다'), { mood: 'request' }, '도와 주세요'],
    [v('주다'), { mood: 'request' }, '주세요'],
    [v('열다'), { mood: 'request' }, '열어 주세요'],
    [v('열다'), { mood: 'request', speech: 'plain' }, '열어 줘'],
    [v('기다리다'), { mood: 'request', speech: 'formal' }, '기다려 주십시오'],
  ];
  it.each(cases)('%o %o → %s', (p, over, out) => expect(realizePredicate(p, f(over))).toBe(out));
});

describe('높임', () => {
  const deusida = v('드시다', 'verb', { honorificLemma: true });
  const jumusida = v('주무시다', 'verb', { honorificLemma: true });
  const cases: [Predicate, Partial<Features>, string][] = [
    [v('가다'), { honorific: true }, '가세요'],
    [v('가다'), { honorific: true, tense: 'past' }, '가셨어요'],
    [v('가다'), { honorific: true, tense: 'future' }, '가실 거예요'],
    [v('가다'), { honorific: true, speech: 'formal' }, '가십니다'],
    [v('읽다'), { honorific: true }, '읽으세요'],
    [v('읽다'), { honorific: true, tense: 'past' }, '읽으셨어요'],
    [v('살다'), { honorific: true }, '사세요'],
    [deusida, { honorific: true }, '드세요'],
    [deusida, { honorific: true, tense: 'past' }, '드셨어요'],
    [deusida, { honorific: true, speech: 'plain' }, '드셔'],
    [jumusida, { honorific: true }, '주무세요'],
    [jumusida, { honorific: true, speech: 'formal' }, '주무십니다'],
    [deusida, { mood: 'command' }, '드세요'],
    [v('가다'), { honorific: true, modality: 'progressive' }, '가고 계세요'],
    [v('가다'), { honorific: true, modality: 'want' }, '가고 싶으세요'],
  ];
  it.each(cases)('%o %o → %s', (p, over, out) => expect(realizePredicate(p, f(over))).toBe(out));
});

describe('부정', () => {
  const cases: [Predicate, Partial<Features>, string][] = [
    [v('가다'), { negation: 'an' }, '안 가요'],
    [v('먹다'), { negation: 'an', tense: 'past' }, '안 먹었어요'],
    [v('가다'), { negation: 'mot' }, '못 가요'],
    [v('공부하다', 'verb', { nounHada: true }), { negation: 'an' }, '공부 안 해요'],
    [v('운동하다', 'verb', { nounHada: true }), { negation: 'mot', tense: 'past' }, '운동 못 했어요'],
    [v('깨끗하다', 'adj'), { negation: 'an' }, '안 깨끗해요'],
    [v('가다'), { negation: 'an', mood: 'command' }, '가지 마세요'],
    [v('가다'), { negation: 'an', mood: 'command', speech: 'plain' }, '가지 마'],
    [v('만지다'), { negation: 'an', mood: 'command', speech: 'formal' }, '만지지 마십시오'],
    [v('가다'), { negation: 'an', mood: 'suggest', speech: 'plain' }, '가지 말자'],
  ];
  it.each(cases)('%o %o → %s', (p, over, out) => expect(realizePredicate(p, f(over))).toBe(out));
});

describe('양태', () => {
  const cases: [Predicate, Partial<Features>, string][] = [
    [v('먹다'), { modality: 'want' }, '먹고 싶어요'],
    [v('가다'), { modality: 'want', tense: 'past' }, '가고 싶었어요'],
    [v('먹다'), { modality: 'want', negation: 'an' }, '안 먹고 싶어요'],
    [v('놀다'), { modality: 'want', speech: 'plain' }, '놀고 싶어'],
    [v('먹다'), { modality: 'progressive' }, '먹고 있어요'],
    [v('자다'), { modality: 'progressive', tense: 'past' }, '자고 있었어요'],
    [v('가다'), { modality: 'can' }, '갈 수 있어요'],
    [v('먹다'), { modality: 'can' }, '먹을 수 있어요'],
    [v('걷다'), { modality: 'can' }, '걸을 수 있어요'],
    [v('가다'), { modality: 'cannot' }, '갈 수 없어요'],
    [v('가다'), { modality: 'must' }, '가야 해요'],
    [v('먹다'), { modality: 'must' }, '먹어야 해요'],
    [v('하다'), { modality: 'must', tense: 'past' }, '해야 했어요'],
    [v('먹다'), { modality: 'try' }, '먹어 봐요'],
    [v('먹다'), { modality: 'try', mood: 'command' }, '먹어 보세요'],
    [v('먹다'), { modality: 'want', mood: 'question' }, '먹고 싶어요?'],
  ];
  it.each(cases)('%o %o → %s', (p, over, out) => expect(realizePredicate(p, f(over))).toBe(out));
});

describe('이다 · 아니다', () => {
  const cases: [string, Partial<Features>, string][] = [
    ['학생', {}, '학생이에요'],
    ['의사', {}, '의사예요'],
    ['학생', { speech: 'plain' }, '학생이야'],
    ['의사', { speech: 'plain' }, '의사야'],
    ['학생', { speech: 'formal' }, '학생입니다'],
    ['의사', { speech: 'formal' }, '의사입니다'],
    ['학생', { tense: 'past' }, '학생이었어요'],
    ['친구', { tense: 'past' }, '친구였어요'],
    ['학생', { tense: 'future' }, '학생일 거예요'],
    ['선생님', { honorific: true }, '선생님이세요'],
    ['의사', { honorific: true }, '의사세요'],
    ['선생님', { honorific: true, speech: 'formal' }, '선생님이십니다'],
    ['선생님', { honorific: true, tense: 'past' }, '선생님이셨어요'],
    ['학생', { mood: 'question' }, '학생이에요?'],
    ['학생', { negation: 'an' }, '학생이 아니에요'],
    ['의사', { negation: 'an' }, '의사가 아니에요'],
    ['의사', { negation: 'an', speech: 'plain' }, '의사가 아니야'],
    ['의사', { negation: 'an', speech: 'formal' }, '의사가 아닙니다'],
  ];
  it.each(cases)('%s %o → %s', (n, over, out) => expect(realizeCopula(n, f(over))).toBe(out));
});
