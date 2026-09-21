import { describe, expect, it } from 'vitest';
import { entry } from '../src/data/core';
import { emptyPrefs, learn, rerank } from '../src/engine/prefer';
import { realize } from '../src/engine/realize';
import type { Speech } from '../src/engine/predicate';

const cards = (ids: string) => ids.split(' ').map((id, i) => ({ key: `${id}#${i}`, entry: entry(id) }));
const ranked = (ids: string, prefs = emptyPrefs(), speech: Speech = 'polite') => {
  const cs = cards(ids);
  return rerank(realize(cs, { speech }), cs, prefs).map((c) => c.text);
};

describe('해석 순위 개인화', () => {
  it('배운 게 없으면 순서를 바꾸지 않는다', () => {
    const cs = cards('halmeoni bap meokda');
    const base = realize(cs, { speech: 'polite' });
    expect(rerank(base, cs, emptyPrefs()).map((c) => c.text)).toEqual(base.map((c) => c.text));
  });

  it('고른 해석이 같은 조합에서 1순위로 올라온다', () => {
    const cs = cards('halmeoni bap meokda');
    const base = realize(cs, { speech: 'polite' });
    const vocative = base.find((c) => c.text === '할머니, 진지를 드세요.')!;
    const prefs = learn(emptyPrefs(), vocative, cs);
    expect(ranked('halmeoni bap meokda', prefs)[0]).toBe('할머니, 진지를 드세요.');
  });

  it('비슷한 종류의 조합으로 번진다: 엄마+쉬+마렵다 → 엄마+배+아프다', () => {
    const cs = cards('eomma swi maryeopda');
    const aboutMom = realize(cs, { speech: 'plain' }).find((c) => c.text === '엄마는 쉬가 마려워.')!;
    // 이 아이는 '엄마 이야기'를 골랐다(부르는 해석이 기본 1순위인 조합)
    let prefs = learn(emptyPrefs(), aboutMom, cs);
    prefs = learn(prefs, aboutMom, cs);
    expect(ranked('eomma bae apeuda', emptyPrefs(), 'plain')[0]).toBe('엄마, 배가 아파.');
    expect(ranked('eomma bae apeuda', prefs, 'plain')[0]).toBe('엄마는 배가 아파.');
  });

  it('순서만 바꾸고 후보를 더하거나 빼지 않는다(뜻은 아이의 것)', () => {
    const cs = cards('chingu yeonpil juda');
    const base = realize(cs, { speech: 'polite' });
    const prefs = learn(emptyPrefs(), base[2]!, cs);
    const after = rerank(base, cs, prefs);
    expect([...after.map((c) => c.text)].sort()).toEqual([...base.map((c) => c.text)].sort());
  });

  it('말투를 바꿔도 같은 해석으로 알아본다', () => {
    const cs = cards('halmeoni bap meokda');
    const polite = realize(cs, { speech: 'polite' });
    const prefs = learn(emptyPrefs(), polite.find((c) => c.text.startsWith('할머니,'))!, cs);
    expect(ranked('halmeoni bap meokda', prefs, 'formal')[0]).toBe('할머니, 진지를 드십시오.');
  });
});
