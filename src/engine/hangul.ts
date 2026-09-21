// 한글 음절 분해·조합과 받침 판정.
// 유니코드 한글 음절(가~힣)은 (초성 × 21 + 중성) × 28 + 종성 + 0xAC00 으로 배열돼 있다.

const BASE = 0xac00;
const LAST = 0xd7a3;

export const CHO = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'] as const;
export const JUNG = ['ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ', 'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ'] as const;
export const JONG = ['', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ', 'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'] as const;

export type Cho = (typeof CHO)[number];
export type Jung = (typeof JUNG)[number];
export type Jong = (typeof JONG)[number];

export interface Syllable {
  cho: Cho;
  jung: Jung;
  jong: Jong;
}

export function isSyllable(ch: string): boolean {
  const c = ch.charCodeAt(0);
  return ch.length === 1 && c >= BASE && c <= LAST;
}

export function decompose(ch: string): Syllable {
  if (!isSyllable(ch)) throw new Error(`한글 음절이 아님: ${ch}`);
  const i = ch.charCodeAt(0) - BASE;
  return {
    cho: CHO[Math.floor(i / 588)]!,
    jung: JUNG[Math.floor((i % 588) / 28)]!,
    jong: JONG[i % 28]!,
  };
}

export function compose(cho: Cho, jung: Jung, jong: Jong = ''): string {
  const a = CHO.indexOf(cho);
  const b = JUNG.indexOf(jung);
  const c = JONG.indexOf(jong);
  if (a < 0 || b < 0 || c < 0) throw new Error(`조합 불가: ${cho}${jung}${jong}`);
  return String.fromCharCode(BASE + a * 588 + b * 28 + c);
}

export function lastChar(word: string): string {
  return word.charAt(word.length - 1);
}

/** 마지막 음절의 받침을 바꾼다. 음절이 아니면 그대로 둔다. */
export function withJong(word: string, jong: Jong): string {
  const last = lastChar(word);
  if (!isSyllable(last)) return word;
  const s = decompose(last);
  return word.slice(0, -1) + compose(s.cho, s.jung, jong);
}

/** 받침 없는 음절 끝에 받침 자모를 붙인다: 가 + ㄹ → 갈, 가 + ㅂ → 갑 */
export function addJong(word: string, jong: Jong): string {
  const last = lastChar(word);
  if (!isSyllable(last) || decompose(last).jong !== '') {
    throw new Error(`받침을 붙일 수 없음: ${word} + ${jong}`);
  }
  return withJong(word, jong);
}

// 숫자·로마자는 한국어로 읽은 소리의 받침을 따른다.
// 1 일, 3 삼, 6 육, 7 칠, 8 팔, 0 영 → 받침 있음 / 2 이, 4 사, 5 오, 9 구 → 없음
const DIGIT_JONG: Record<string, Jong> = { '0': 'ㅇ', '1': 'ㄹ', '2': '', '3': 'ㅁ', '4': '', '5': '', '6': 'ㄱ', '7': 'ㄹ', '8': 'ㄹ', '9': '' };
// 끝자리가 0이면 마지막 자릿수 이름으로 읽는다: 십 백 천, 그 위는 만(~천만) 억(~천억) 조.
function zerosJong(zeros: number): Jong {
  if (zeros === 1) return 'ㅂ'; // 십
  if (zeros === 2) return 'ㄱ'; // 백
  if (zeros === 3) return 'ㄴ'; // 천
  if (zeros < 8) return 'ㄴ'; // 만, 십만, 백만, 천만
  if (zeros < 12) return 'ㄱ'; // 억
  return ''; // 조
}
// 로마자 이름: 엘(L) 엠(M) 엔(N) 알(R) 만 받침이 있다.
const LATIN_JONG: Record<string, Jong> = { l: 'ㄹ', m: 'ㅁ', n: 'ㄴ', r: 'ㄹ' };

/** 낱말 끝소리의 받침. 판단할 수 없으면 null. */
export function finalJong(word: string): Jong | null {
  const trimmed = word.replace(/[\s)\]}"'’”.,!?~]+$/u, '');
  if (!trimmed) return null;
  const last = lastChar(trimmed);
  if (isSyllable(last)) return decompose(last).jong;
  if (/[0-9]/.test(last)) {
    if (last !== '0') return DIGIT_JONG[last]!;
    const digits = trimmed.match(/[0-9]+$/)![0];
    const zeros = digits.length - digits.replace(/0+$/, '').length;
    if (zeros === digits.length) return 'ㅇ'; // 0, 00 → 영
    return zerosJong(zeros);
  }
  if (/[a-z]/i.test(last)) return LATIN_JONG[last.toLowerCase()] ?? '';
  return null;
}

export function hasBatchim(word: string): boolean {
  const j = finalJong(word);
  return j !== null && j !== '';
}
