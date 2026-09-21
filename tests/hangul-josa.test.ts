import { describe, expect, it } from 'vitest';
import { josa as esJosa } from 'es-hangul';
import { compose, decompose, finalJong, hasBatchim } from '../src/engine/hangul';
import { attachJosa, josaFor } from '../src/engine/josa';

describe('음절 분해·조합', () => {
  it('왕복한다', () => {
    for (const ch of ['가', '힣', '닭', '뷁', '쌍', '의']) {
      const s = decompose(ch);
      expect(compose(s.cho, s.jung, s.jong)).toBe(ch);
    }
  });
  it('겹받침을 하나의 받침으로 본다', () => {
    expect(decompose('닭').jong).toBe('ㄺ');
    expect(decompose('앉').jong).toBe('ㄵ');
  });
});

describe('받침 판정', () => {
  it.each([
    ['사과', ''],
    ['밥', 'ㅂ'],
    ['물', 'ㄹ'],
    ['학교', ''],
    ['선생님', 'ㅁ'],
  ])('%s → "%s"', (w, j) => expect(finalJong(w)).toBe(j));

  it.each([
    ['1', true], // 일
    ['2', false], // 이
    ['3', true], // 삼
    ['4', false], // 사
    ['5', false], // 오
    ['6', true], // 육
    ['7', true], // 칠
    ['8', true], // 팔
    ['9', false], // 구
    ['10', true], // 십
    ['20', true], // 이십
    ['100', true], // 백
    ['1000', true], // 천
    ['10000', true], // 만
    ['105', false], // 백오
    ['0', true], // 영
  ])('숫자 %s → 받침 %s', (w, b) => expect(hasBatchim(w)).toBe(b));

  it('로마자는 이름 소리로 판정한다', () => {
    expect(hasBatchim('TV')).toBe(false); // 브이
    expect(hasBatchim('PM')).toBe(true); // 엠
    expect(hasBatchim('URL')).toBe(true); // 엘
  });

  it('끝 문장부호는 무시한다', () => {
    expect(hasBatchim('밥!')).toBe(true);
    expect(hasBatchim('"사과"')).toBe(false);
  });
});

describe('조사 이형태', () => {
  it.each([
    ['밥', '을/를', '밥을'],
    ['사과', '을/를', '사과를'],
    ['나', '은/는', '나는'],
    ['선생님', '은/는', '선생님은'],
    ['엄마', '이/가', '엄마가'],
    ['동생', '이/가', '동생이'],
    ['친구', '과/와', '친구와'],
    ['동생', '과/와', '동생과'],
    ['학교', '으로/로', '학교로'],
    ['집', '으로/로', '집으로'],
    ['지하철', '으로/로', '지하철로'], // ㄹ 받침은 '로'
    ['연필', '으로', '연필로'],
    ['지민', '아/야', '지민아'],
    ['민수', '아/야', '민수야'],
    ['학생', '이에요/예요', '학생이에요'],
    ['의사', '이에요/예요', '의사예요'],
    ['엄마', '이랑/랑', '엄마랑'],
    ['동생', '이랑/랑', '동생이랑'],
    ['학교', '에', '학교에'],
    ['집', '에서', '집에서'],
  ])('%s + %s → %s', (w, j, out) => expect(attachJosa(w, j)).toBe(out));

  it('한쪽 형태만 적어도 앞말에 맞춘다', () => {
    expect(attachJosa('밥', '를')).toBe('밥을');
    expect(attachJosa('사과', '을')).toBe('사과를');
    expect(attachJosa('책', '는')).toBe('책은');
  });

  it('받침을 모르면 두 형태를 함께 보인다', () => {
    expect(josaFor('♥', '을/를')).toBe('을(를)');
  });

  // 교차 검증: 토스 es-hangul(MIT)의 josa 와 같은 답을 내는지
  const words = ['사과', '밥', '물', '학교', '집', '연필', '지하철', '선생님', '친구', '동생', '고양이', '강아지', '빵', '우유', '할머니', '책', '공', '버스', '기차', '비행기'];
  const esCases: [string, Parameters<typeof esJosa>[1]][] = [
    ['을/를', '을/를'],
    ['은/는', '은/는'],
    ['이/가', '이/가'],
    ['과/와', '와/과'],
    ['으로/로', '으로/로'],
    ['이랑/랑', '이랑/랑'],
  ];
  it.each(esCases)('es-hangul 과 일치: %s', (mine, theirs) => {
    for (const w of words) expect(attachJosa(w, mine)).toBe(esJosa(w, theirs));
  });
});
