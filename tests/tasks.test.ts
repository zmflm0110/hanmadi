import { describe, expect, it } from 'vitest';
import { TASKS } from '../src/app/tasks';
import { entry } from '../src/data/core';
import { realize } from '../src/engine/realize';

// 사용성 평가 과제마다 '있는 카드로 풀 수 있는지' 확인한다. 풀 수 없는 과제는 평가를 왜곡한다.
const SOLUTIONS: Record<string, string> = {
  t01: 'mul juseyo',
  t02: 'hwajangsil gada sipda',
  t03: 'eomma bae apeuda',
  t04: 'chingu gachi nolda',
  t05: 'halmeoni bap meokda',
  t06: 'eoje gongwon gada',
  t07: 'gansik deo meokda sipda',
  t08: 'misul geuman hada sipda',
  t09: 'chingu mwo meokda sipda',
  t10: 'seonsaengnim chaek ikda juseyo',
  t11: 'naeil beoseu tada',
  t12: 'tv kkeuda jimaseyo',
};

describe('사용성 평가 과제는 있는 카드로 풀 수 있다', () => {
  it('모든 과제에 풀이가 있다', () => expect(Object.keys(SOLUTIONS).sort()).toEqual(TASKS.map((t) => t.id).sort()));
  it.each(TASKS.map((t) => [t.id, t] as const))('%s', (id, t) => {
    const cards = SOLUTIONS[id]!.split(' ').map((c, i) => ({ key: `${c}#${i}`, entry: entry(c) }));
    const texts = realize(cards, { speech: t.speech }).slice(0, 3).map((c) => c.text);
    expect(texts.some((x) => t.expect.test(x)), `${t.prompt} → ${texts.join(' | ')}`).toBe(true);
  });
});
