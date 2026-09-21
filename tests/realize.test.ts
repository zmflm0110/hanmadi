import { describe, expect, it } from 'vitest';
import { CORE, entry } from '../src/data/core';
import { decompose, isSyllable } from '../src/engine/hangul';
import type { Entry, PredEntry } from '../src/engine/lexicon';
import type { Speech } from '../src/engine/predicate';
import { realize, type Card } from '../src/engine/realize';

const cards = (ids: string) => ids.split(/\s+/).map((id, i) => ({ key: `${id}#${i}`, entry: entry(id) }));
const top = (ids: string, speech: Speech = 'polite') => realize(cards(ids), { speech })[0]?.text;
const texts = (ids: string, speech: Speech = 'polite') => realize(cards(ids), { speech }).map((c) => c.text);

describe('대표 문장(1순위)', () => {
  it.each([
    ['na hakgyo gada', 'polite', '저는 학교에 가요.'],
    ['na hakgyo gada', 'plain', '나는 학교에 가.'],
    ['na hakgyo gada', 'formal', '저는 학교에 갑니다.'],
    ['halmeoni bap meokda', 'polite', '할머니가 진지를 드세요.'],
    ['halmeoni bap meokda', 'formal', '할머니께서 진지를 드십니다.'],
    ['halmeoni jip itda', 'polite', '할머니가 댁에 계세요.'],
    ['na halmeoni chaek juda', 'polite', '저는 할머니께 책을 드려요.'],
    ['na sagwa jota', 'polite', '저는 사과가 좋아요.'],
    ['na bae apeuda', 'polite', '저는 배가 아파요.'],
    ['na yeonpil itda', 'polite', '저는 연필이 있어요.'],
    ['eoje chingu gongwon nolda', 'polite', '어제 친구가 공원에서 놀았어요.'],
    ['chingu gongwon nolda gada', 'polite', '친구가 공원에 놀러 가요.'],
    ['bap meokda gada', 'polite', '밥을 먹으러 가요.'],
    ['naeil beoseu tada', 'polite', '내일 버스를 탈 거예요.'],
    ['mwo meokda', 'polite', '뭐 먹어요?'],
    ['eodi gada', 'polite', '어디 가요?'],
    ['hwajangsil eodi', 'polite', '화장실이 어디예요?'],
    ['eomma mul juseyo', 'polite', '엄마, 물 주세요.'],
    ['mul juseyo', 'plain', '물 줘.'],
    ['an bap meokda', 'polite', '밥을 안 먹어요.'],
    ['ppang meokda sipda', 'polite', '빵을 먹고 싶어요.'],
    ['tv kkeuda jimaseyo', 'polite', '텔레비전을 끄지 마세요.'],
    ['gachi nolda', 'polite', '같이 놀까요?'],
    ['uri gachi noriteo gada', 'polite', '우리 같이 놀이터에 갈까요?'],
    ['uri gachi noriteo gada', 'plain', '우리 같이 놀이터에 가자.'],
    ['uri hakgyo gada', 'polite', '저희는 학교에 가요.'],
    ['annyeong', 'polite', '안녕하세요.'],
    ['gomawo', 'formal', '감사합니다.'],
    ['annyeong na hakgyo gada', 'polite', '안녕하세요. 저는 학교에 가요.'],
    ['mul', 'polite', '물이요.'],
    ['nugu oda', 'polite', '누가 와요?'],
    ['na gongbu hada', 'polite', '저는 공부를 해요.'],
    ['na gongbuhada an', 'polite', '저는 공부 안 해요.'],
    ['seonsaengnim hakgyo itda', 'formal', '선생님께서 학교에 계십니다.'],
    ['jeonyeok ramyeon meokda', 'polite', '저녁에 라면을 먹어요.'],
    ['na mongmareuda', 'polite', '저는 목말라요.'],
    ['gongwon deopda', 'polite', '공원이 더워요.'],
    // 가리키는 말·도·만·소유·수량·꾸밈
    ['igeo juseyo', 'polite', '이거 주세요.'],
    ['igeo mwo', 'polite', '이게 뭐예요?'],
    ['igeo mwo', 'formal', '이것이 무엇입니까?'],
    ['na igeo jota', 'polite', '저는 이게 좋아요.'],
    ['na igeo sireohada', 'plain', '나는 이걸 싫어해.'],
    ['yeogi anjda', 'polite', '여기 앉아요.'],
    ['yeogi anjda', 'formal', '여기에 앉습니다.'],
    ['na yeogi nolda sipda', 'polite', '저는 여기서 놀고 싶어요.'],
    ['na do gada sipda', 'polite', '저도 가고 싶어요.'],
    ['na do', 'polite', '저도요.'],
    ['na do', 'plain', '나도.'],
    ['mul man juseyo', 'polite', '물만 주세요.'],
    ['sagwa dul juseyo', 'polite', '사과 두 개 주세요.'],
    ['sagwa dul man juseyo', 'polite', '사과 두 개만 주세요.'],
    ['mul hana juseyo', 'polite', '물 한 잔 주세요.'],
    ['chingu set oda past', 'polite', '친구가 세 명 왔어요.'],
    ['ppalgata gong juseyo', 'polite', '빨간 공 주세요.'],
    ['na keuda sagwa meokda sipda', 'polite', '저는 큰 사과를 먹고 싶어요.'],
    ['masitda ppang meokda sipda', 'polite', '맛있는 빵을 먹고 싶어요.'],
    ['nae gabang eodi', 'polite', '제 가방이 어디예요?'],
    ['nae gabang eodi', 'plain', '내 가방이 어디야?'],
    ['halmeoni do bap meokda', 'polite', '할머니도 진지를 드세요.'],
    ['na hakgyo do gada', 'polite', '저는 학교에도 가요.'],
    ['gong ppalgata', 'polite', '공이 빨개요.'],
    ['seonsaengnim dowajwo', 'polite', '선생님, 도와주세요.'],
    ['eomma ne', 'plain', '엄마, 응.'],
    ['chingu annyeong', 'plain', '친구야, 안녕.'],
  ])('[%s] %s → %s', (ids, speech, out) => expect(top(ids, speech as Speech)).toBe(out));
});

describe('애매하면 다른 해석을 후보로 함께 낸다', () => {
  it('할머니 밥 먹다: 말하기와 부르기', () => {
    expect(texts('halmeoni bap meokda').slice(0, 3)).toContain('할머니, 진지를 드세요.');
  });
  it('할머니 집 있다: 계신다와 가지셨다', () => {
    expect(texts('halmeoni jip itda')).toContain('할머니는 집이 있으세요.');
  });
  it('친구 연필 주다: 친구가 주는지, 친구에게 주는지', () => {
    const t = texts('chingu yeonpil juda').slice(0, 3);
    expect(t).toContain('친구가 연필을 줘요.');
    expect(t).toContain('친구에게 연필을 줘요.');
  });
  it('사람 카드로 시작하는 속마음 문장: 부르는 해석이 먼저, 그 사람 이야기도 후보로', () => {
    const t = texts('halmeoni apeuda').slice(0, 2);
    expect(t).toEqual(['할머니, 아파요.', '할머니는 아프세요.']);
    expect(top('eomma eungga maryeopda', 'plain')).toBe('엄마, 응가가 마려워.');
    expect(top('seonsaengnim hwajangsil gada sipda')).toBe('선생님, 화장실에 가고 싶어요.');
    expect(top('halmeoni mwo meokda volition')).toBe('할머니, 뭐 드실래요?');
  });
  it('반말로 친구를 부르면 호격 조사', () => {
    expect(texts('chingu gachi nolda', 'plain')).toContain('친구야, 같이 놀자.');
  });
  it('높일 사람을 부를 때는 반말 설정이어도 존댓말', () => {
    expect(texts('halmeoni bap meokda', 'plain')).toContain('할머니, 진지를 드세요.');
  });
});

// ── 속성: 뜻은 사용자가, 문법은 엔진이 ────────────────────────────────────
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

function firstCho(s: string): string | null {
  const ch = s.replace(/^(안|못) /, '').charAt(0);
  return isSyllable(ch) ? decompose(ch).cho : null;
}

function predLemmas(e: PredEntry): string[] {
  return [e.lemma, e.honorLemma, e.humbleLemma].filter((x): x is string => !!x);
}

function nounForms(e: Entry): string[] {
  if (e.kind !== 'noun') return [];
  const forms = [e.word, e.honorForm].filter((x): x is string => !!x);
  if (e.cat === 'self') forms.push('저', '제', '내');
  if (e.cat === 'we') forms.push('저희');
  if (e.cat === 'you') forms.push('네');
  if (e.word === '누구') forms.push('누가');
  if (e.word === '뭐') forms.push('뭘', '무엇'); // 같은 낱말의 말투 변이
  if (e.deictic && e.cat === 'thing') forms.push(e.word.slice(0, -1)); // 이게·이걸·이건·이것
  return forms;
}

describe('속성: 모든 카드가 문장에 반영되고, 카드에 없는 내용어는 생기지 않는다', () => {
  const pick = rng(20260921);
  const pool = CORE;
  const samples: Card[][] = [];
  for (let s = 0; s < 3000; s++) {
    const len = 1 + Math.floor(pick() * 5);
    samples.push(Array.from({ length: len }, (_, i) => {
      const e = pool[Math.floor(pick() * pool.length)]!;
      return { key: `${e.id}#${i}`, entry: e };
    }));
  }

  it.each(['plain', 'polite', 'formal'] as Speech[])('%s: 3000개 무작위 카드열', (speech) => {
    let checked = 0;
    for (const seq of samples) {
      for (const c of realize(seq, { speech })) {
        checked++;
        const covered = new Set(c.tokens.flatMap((t) => t.sources).concat(c.unused));
        for (const card of seq) expect(covered, `${c.text} ← ${seq.map((x) => x.key)}`).toContain(card.key);

        for (const t of c.tokens) {
          if (t.sources.length === 0) {
            expect(['.', '?', ''], `출처 없는 토큰 "${t.text}" in ${c.text}`).toContain(t.text);
            continue;
          }
          const src = seq.find((x) => x.key === t.sources[0])!.entry;
          if (!t.text) continue; // 생략된 주어
          if (src.kind === 'noun') {
            // 꾸밈(빨간·내)이 앞에 올 수 있어 '들어 있는지'로 본다
            const ok = nounForms(src).some((f) => t.text.split(' ').some((w) => w.startsWith(f)));
            expect(ok, `명사 "${t.text}" ← ${src.word} in ${c.text}`).toBe(true);
          }
          if (src.kind === 'pred') {
            const chos = predLemmas(src).map(firstCho);
            expect(chos, `서술어 "${t.text}" ← ${src.lemma} in ${c.text}`).toContain(firstCho(t.text));
          }
          if (src.kind === 'adverb' || src.kind === 'phrase') expect(t.text.length).toBeGreaterThan(0);
        }
      }
    }
    expect(checked).toBeGreaterThan(3000);
  });
});
