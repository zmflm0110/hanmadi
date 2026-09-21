// 용언 활용: 사전형(먹다, 돕다, 듣다 …)과 문장 자질(시제·말투·높임 …)을 받아 서술어를 만든다.
//
// 어미는 세 부류로 나눠 붙인다.
//   A  '-아/어'로 시작: 먹어, 도와, 들어, 몰라, 해, 추워 …  (+요, +ㅆ어요, +서, +야 …)
//   EU '-(으)'로 시작: 먹으세요, 가세요, 사세요(살다), 추울 거예요, 들으면 …
//   C  자음으로 시작: 먹고, 가지, 사는(살다), 갑니다/먹습니다 …
import { addJong, compose, decompose, isSyllable, lastChar, withJong, type Jong, type Jung } from './hangul';

export type Pos = 'verb' | 'adj';

/** 활용 부류. 규칙 활용도 받침·모음에 따라 나눈다. */
export type Conj =
  | 'regular'
  | 'rieul' // ㄹ 탈락: 살다 → 사세요, 삽니다
  | 'eu' // 으 탈락: 쓰다 → 써, 바쁘다 → 바빠, 따르다 → 따라
  | 'hada' // 하다 → 해
  | 'b' // ㅂ 불규칙: 춥다 → 추워
  | 'b-wa' // ㅂ 불규칙 중 돕다·곱다 → 도와, 고와
  | 'd' // ㄷ 불규칙: 듣다 → 들어
  | 's' // ㅅ 불규칙: 짓다 → 지어
  | 'h' // ㅎ 불규칙: 파랗다 → 파래
  | 'reu' // 르 불규칙: 모르다 → 몰라
  | 'reo' // 러 불규칙: 푸르다 → 푸르러
  | 'u'; // 우 불규칙: 푸다 → 퍼

export interface Predicate {
  lemma: string; // 사전형, '-다'로 끝남
  pos: Pos;
  conj?: Conj; // 비우면 추정
  /** 이미 높임 뜻을 가진 낱말(드시다, 주무시다, 계시다)은 -(으)시-를 또 붙이지 않는다 */
  honorificLemma?: boolean;
  /** 명사+하다 동사(공부하다): 부정을 '공부 안 해요'로 만든다 */
  nounHada?: boolean;
}

// ── 불규칙 추정에 쓰는 목록 ──────────────────────────────────────────────
// 동사 중 ㅂ 불규칙(대부분의 동사는 규칙: 입다, 잡다, 씹다, 뽑다 …)
const B_IRREGULAR_VERBS = new Set(['돕', '눕', '줍', '굽', '깁', '여쭙']);
// 형용사 중 ㅂ 규칙(대부분의 형용사는 불규칙: 춥다, 덥다, 어렵다 …)
const B_REGULAR_ADJS = new Set(['좁', '수줍']);
const B_WA = new Set(['돕', '곱']);
const D_IRREGULAR = new Set(['듣', '걷', '묻', '싣', '깨닫', '긷', '일컫', '붇']);
const S_IRREGULAR = new Set(['짓', '낫', '붓', '긋', '잇', '젓']);
const H_REGULAR_ADJS = new Set(['좋']);
// 르로 끝나지만 르 불규칙이 아닌 것
const REU_AS_EU = new Set(['따르', '치르', '들르', '우러르', '다다르']);
const REU_AS_REO = new Set(['푸르', '노르']);

export function stemOf(lemma: string): string {
  if (!lemma.endsWith('다') || lemma.length < 2) throw new Error(`사전형이 아님: ${lemma}`);
  return lemma.slice(0, -1);
}

export function inferConj(p: Predicate): Conj {
  if (p.conj) return p.conj;
  const stem = stemOf(p.lemma);
  const last = lastChar(stem);
  if (!isSyllable(last)) throw new Error(`한글 어간이 아님: ${p.lemma}`);
  const { jung, jong } = decompose(last);
  if (last === '하') return 'hada';
  if (stem === '푸') return 'u';
  if (last === '르' && stem.length >= 2) {
    if (REU_AS_EU.has(stem)) return 'eu';
    if (REU_AS_REO.has(stem)) return 'reo';
    return 'reu';
  }
  switch (jong) {
    case '':
      return jung === 'ㅡ' ? 'eu' : 'regular';
    case 'ㄹ':
      return 'rieul';
    case 'ㅂ':
      if (B_WA.has(stem)) return 'b-wa';
      if (p.pos === 'adj') return B_REGULAR_ADJS.has(stem) ? 'regular' : 'b';
      return B_IRREGULAR_VERBS.has(stem) ? 'b' : 'regular';
    case 'ㄷ':
      return D_IRREGULAR.has(stem) ? 'd' : 'regular';
    case 'ㅅ':
      return S_IRREGULAR.has(stem) ? 's' : 'regular';
    case 'ㅎ':
      return p.pos === 'adj' && !H_REGULAR_ADJS.has(stem) ? 'h' : 'regular';
    default:
      return 'regular';
  }
}

// ── 음운 도우미 ──────────────────────────────────────────────────────────
const BRIGHT = new Set<Jung>(['ㅏ', 'ㅗ', 'ㅑ']);

function lastSyl(s: string) {
  return decompose(lastChar(s));
}

function replaceLast(s: string, cho: Parameters<typeof compose>[0], jung: Jung, jong: Jong = ''): string {
  return s.slice(0, -1) + compose(cho, jung, jong);
}

/** 모음조화: 기준 음절 모음이 ㅏ·ㅗ·ㅑ면 '아', 아니면 '어' */
function isBright(syllable: string): boolean {
  return BRIGHT.has(decompose(syllable).jung);
}

/** 받침 없는 어간 끝에 ㅏ/ㅓ 를 녹여 붙인다: 가+아→가, 오+아→와, 마시+어→마셔 */
function fuseVowel(stem: string): string {
  const { cho, jung } = lastSyl(stem);
  switch (jung) {
    case 'ㅏ':
    case 'ㅓ':
    case 'ㅐ':
    case 'ㅔ':
    case 'ㅕ':
    case 'ㅒ':
    case 'ㅖ':
    case 'ㅘ':
    case 'ㅝ':
    case 'ㅙ':
    case 'ㅞ':
      return stem; // 가, 서, 보내, 세, 켜 …
    case 'ㅗ':
      return replaceLast(stem, cho, 'ㅘ'); // 오→와, 보→봐
    case 'ㅜ':
      return replaceLast(stem, cho, 'ㅝ'); // 주→줘, 배우→배워
    case 'ㅣ':
      return replaceLast(stem, cho, 'ㅕ'); // 마시→마셔, 기다리→기다려
    case 'ㅚ':
      return replaceLast(stem, cho, 'ㅙ'); // 되→돼
    case 'ㅛ':
    case 'ㅠ':
    case 'ㅑ':
      return stem + (jung === 'ㅑ' || jung === 'ㅛ' ? '아' : '어');
    default:
      return stem + '어'; // ㅟ, ㅢ: 쉬어, 띄어
  }
}

/** '-아/어' 형(해체 모양): 먹어, 도와, 들어, 지어, 파래, 몰라, 푸르러, 퍼, 써, 해 */
export function infinitive(p: Predicate): string {
  const stem = stemOf(p.lemma);
  const conj = inferConj(p);
  const last = lastChar(stem);
  const { cho, jung, jong } = decompose(last);
  const ending = () => (isBright(last) ? '아' : '어');
  switch (conj) {
    case 'hada':
      return stem.slice(0, -1) + '해';
    case 'u':
      return replaceLast(stem, cho, 'ㅓ'); // 푸→퍼
    case 'reu': {
      const before = stem.slice(0, -1);
      const prev = lastChar(before);
      const bright = isBright(prev);
      return withJong(before, 'ㄹ') + (bright ? '라' : '러'); // 모르→몰라, 부르→불러
    }
    case 'reo':
      return stem + '러';
    case 'eu': {
      // 으 탈락: 앞 음절 모음으로 조화, 한 음절이면 '어'
      const bright = stem.length >= 2 && isBright(stem.charAt(stem.length - 2));
      return replaceLast(stem, cho, bright ? 'ㅏ' : 'ㅓ');
    }
    case 'b':
      return withJong(stem, '') + '워'; // 춥→추워
    case 'b-wa':
      return withJong(stem, '') + '와'; // 돕→도와
    case 'd':
      return withJong(stem, 'ㄹ') + ending(); // 듣→들어
    case 's':
      return withJong(stem, '') + ending(); // 짓→지어 (줄지 않음)
    case 'h': {
      const v: Jung = jung === 'ㅑ' || jung === 'ㅕ' ? 'ㅒ' : 'ㅐ';
      return replaceLast(stem, cho, v); // 파랗→파래, 하얗→하얘
    }
    case 'rieul':
    case 'regular':
      if (jong === '') return fuseVowel(stem);
      return stem + ending();
  }
}

/**
 * '-(으)' 어미 붙이기. rest 는 '으' 뒤에 오는 부분이며 자모로 시작할 수 있다.
 *   rest='세요' → 먹으세요/가세요/사세요,  rest='ㄹ 거예요' → 먹을/갈/살 거예요,  rest='면' → 먹으면/가면/살면
 */
export function attachEu(p: Predicate, rest: string): string {
  const stem = stemOf(p.lemma);
  const conj = inferConj(p);
  const head = rest.charAt(0);
  const tail = rest.slice(1);
  const jamoHead = /[ㄱ-ㅎ]/.test(head) ? (head as Jong) : null;

  // '으'가 빠지는 어간에 붙이기(모음 어간 등)
  const joinVowel = (s: string): string => (jamoHead ? addJong(s, jamoHead) + tail : s + rest);
  // '으'를 살려 붙이기(자음 어간)
  const joinEu = (s: string): string => (jamoHead ? s + compose('ㅇ', 'ㅡ', jamoHead) + tail : s + '으' + rest);

  switch (conj) {
    case 'rieul': {
      // ㄹ 탈락: ㄴ·ㅅ·ㅂ 앞에서 ㄹ이 빠지고, ㄹ 앞에서는 하나로 합쳐진다. 'ㅁ'(면)은 그대로.
      if (jamoHead === 'ㄹ') return stem + tail; // 살+ㄹ 거예요 → 살 거예요
      const dropped = withJong(stem, '');
      if (jamoHead === 'ㄴ' || jamoHead === 'ㅂ') return addJong(dropped, jamoHead) + tail; // 산, 삽시다
      if (head === '세' || head === '시' || head === '셔' || head === '셨' || head === '십' || head === '실' || head === '니') return dropped + rest; // 사세요, 사니까
      return stem + rest; // 살면
    }
    case 'b':
    case 'b-wa':
      return joinVowel(withJong(stem, '') + '우'); // 추우면, 도우세요, 추울 거예요
    case 'd':
      return joinEu(withJong(stem, 'ㄹ')); // 들으세요, 걸을 거예요
    case 's':
      return joinEu(withJong(stem, '')); // 지으세요, 나을 거예요
    case 'h':
      return joinVowel(withJong(stem, '')); // 파라면, 그러세요, 그럴 거예요
    case 'regular':
      return lastSyl(stem).jong === '' ? joinVowel(stem) : joinEu(stem);
    default:
      return joinVowel(stem); // 하다·르·러·으·우: 모음 어간
  }
}

/** 자음으로 시작하는 어미: 고, 지, 게, 네요, 는, 자 … (ㄹ 어간은 ㄴ 앞에서 ㄹ 탈락) */
export function attachC(p: Predicate, rest: string): string {
  const stem = stemOf(p.lemma);
  const conj = inferConj(p);
  if (conj === 'rieul') {
    const c = decompose(rest.charAt(0)).cho;
    if (c === 'ㄴ') return withJong(stem, '') + rest; // 사는, 사네요
  }
  return stem + rest;
}

/** -ㅂ니다/-습니다 계열: rest='니다' | '니까' | '시다' */
export function attachFormal(p: Predicate, rest: string): string {
  const stem = stemOf(p.lemma);
  const conj = inferConj(p);
  const { jong } = lastSyl(stem);
  if (conj === 'rieul') return addJong(withJong(stem, ''), 'ㅂ') + rest; // 삽니다, 만듭니다
  if (jong === '') return addJong(stem, 'ㅂ') + rest; // 갑니다, 합니다, 모릅니다
  if (rest === '시다') return attachEu(p, 'ㅂ시다'); // 먹읍시다, 도웁시다, 들읍시다
  return stem + '습' + rest; // 먹습니다, 춥습니다, 듣습니다
}

/** 과거 어간: 갔, 먹었, 했, 도왔, 들었 … (뒤에 '어'가 붙는다) */
export function pastStem(p: Predicate): string {
  return addJong(infinitive(p), 'ㅆ');
}

/** -(으)시- 를 붙인 새 용언. 이미 높임 낱말이면 그대로. */
export function honor(p: Predicate): Predicate {
  if (p.honorificLemma) return p;
  return { lemma: attachEu(p, '시다'), pos: p.pos, conj: 'regular', honorificLemma: true };
}

export function isHonorStem(p: Predicate): boolean {
  return lastChar(stemOf(p.lemma)) === '시' && !!p.honorificLemma;
}
