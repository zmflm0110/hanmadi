import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OWN_SYMBOLS } from '../src/app/board';
import { CORE } from '../src/data/core';
import pictograms from '../src/data/pictograms.json';

// 원칙 2(글 없이 된다): 모든 카드에 그림이나 기호가 있어야 한다. 낱말을 넣고 그림을 빠뜨리면 여기서 걸린다.
describe('모든 카드에 그림이 있다', () => {
  const picto = pictograms as Record<string, unknown>;
  it.each(CORE.map((e) => [e.id, e] as const))('%s', (id) => {
    const own = OWN_SYMBOLS[id];
    const file = own ? `public/pictograms/${own}` : `public/pictograms/${id}.png`;
    expect(!!own || id in picto, `${id}: 그림 연결 없음`).toBe(true);
    expect(existsSync(file), `${file} 없음`).toBe(true);
  });
});
