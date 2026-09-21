// 카드(낱말) 사전의 모양. 실제 낱말 목록은 src/data 에 있다.
import type { Conj, Pos } from './conjugate';
import type { Features, Modality, Mood, Negation, Tense } from './predicate';

/** 명사의 의미 범주. 격틀의 자리에 들어갈 수 있는지 판단하는 데 쓴다. */
export type Category =
  | 'self' // 나
  | 'you' // 너
  | 'we' // 우리
  | 'person'
  | 'animal'
  | 'place'
  | 'food'
  | 'drink'
  | 'thing'
  | 'toy'
  | 'vehicle'
  | 'body'
  | 'clothes'
  | 'activity' // 공부, 운동 (하다와 어울림)
  | 'time';

/** 격틀의 자리 이름 */
export type Role =
  | 'agent' // 하는 이
  | 'experiencer' // 느끼는 이 (좋다·아프다의 주체)
  | 'theme' // 대상
  | 'goal' // 가는 곳
  | 'location' // 일이 일어나는 곳
  | 'source' // 출발점
  | 'recipient' // 받는 이
  | 'companion' // 함께하는 이
  | 'instrument' // 도구·수단
  | 'time';

export interface Slot {
  role: Role;
  josa: string; // 조사(이형태 쌍 또는 고정형). '' 이면 조사 없이.
  cats: Category[];
}

export interface NounEntry {
  kind: 'noun';
  id: string;
  word: string;
  cat: Category;
  /** 높여야 하는 사람(할머니, 선생님) */
  honorific?: boolean;
  /** 높임 대상이 주체일 때 이 낱말 대신 쓰는 말(밥→진지, 집→댁) */
  honorForm?: string;
  /** 시간 낱말에 붙는 조사: 아침'에', 어제(없음) */
  timeJosa?: '' | '에';
  /** 시간 낱말이 정하는 시제 */
  tense?: Tense;
  /** 의문사: 뭐, 누구, 어디, 언제 */
  wh?: boolean;
  /** 다른 범주로도 쓰이는 낱말(아침 = 때·끼니) */
  alt?: Category[];
  /** 반말로 부를 때 호격 조사 아/야를 붙이는 말(친구야, 동생아). 엄마·형처럼 부르는 친족어는 안 붙인다 */
  callSuffix?: boolean;
}

export interface PredEntry {
  kind: 'pred';
  id: string;
  lemma: string;
  pos: Pos;
  conj?: Conj;
  nounHada?: boolean;
  frame: Slot[];
  /** 높임 주체일 때 바꿔 쓰는 낱말(먹다→드시다) */
  honorLemma?: string;
  /** 받는 이를 높일 때 바꿔 쓰는 낱말(주다→드리다) */
  humbleLemma?: string;
  /** 이동 동사(가다·오다): 앞 동사를 '-(으)러'로 잇는다 */
  motion?: boolean;
}

/** 문장 자질을 바꾸는 기능 카드: [안] [못] [?] [주세요] [같이] [싶어요] … */
export interface MarkerEntry {
  kind: 'marker';
  id: string;
  word: string; // 카드에 보이는 글자
  set: Partial<Pick<Features, 'mood' | 'negation' | 'modality' | 'tense'>> & {
    mood?: Mood;
    negation?: Negation;
    modality?: Modality;
    tense?: Tense;
  };
  /** 문장에 그대로 남는 부사(같이, 또) — 없으면 문장에 흔적이 안 남는다 */
  surface?: string;
}

/** 꾸미는 말: 빨리, 많이, 너무 … */
export interface AdverbEntry {
  kind: 'adverb';
  id: string;
  word: string;
  /** 부정문 앞에서는 다른 말(안 → 전혀?) 같은 변화 없음. 의문 부사(왜)면 true */
  wh?: boolean;
}

/** 통째로 쓰는 인사·대답: 말투에 따라 모양만 바뀐다 */
export interface PhraseEntry {
  kind: 'phrase';
  id: string;
  word: string; // 카드 글자
  plain: string;
  polite: string;
  formal: string;
}

export type Entry = NounEntry | PredEntry | MarkerEntry | AdverbEntry | PhraseEntry;

// ── 자주 쓰는 격틀 조각 ──────────────────────────────────────────────────
export const PEOPLE: Category[] = ['self', 'you', 'we', 'person'];
export const ANIMATE: Category[] = [...PEOPLE, 'animal'];
export const EDIBLE: Category[] = ['food', 'drink'];
export const OBJECTS: Category[] = ['food', 'drink', 'thing', 'toy', 'clothes', 'vehicle', 'animal'];

export const S = {
  agent: { role: 'agent', josa: '이/가', cats: ANIMATE } as Slot,
  experiencer: { role: 'experiencer', josa: '은/는', cats: ANIMATE } as Slot,
  goal: { role: 'goal', josa: '에', cats: ['place'] } as Slot,
  location: { role: 'location', josa: '에서', cats: ['place'] } as Slot,
  locationAt: { role: 'location', josa: '에', cats: ['place'] } as Slot, // 있다·앉다·살다
  source: { role: 'source', josa: '에서', cats: ['place'] } as Slot,
  companion: { role: 'companion', josa: '이랑/랑', cats: ANIMATE } as Slot,
  instrument: { role: 'instrument', josa: '으로/로', cats: ['vehicle', 'thing', 'toy'] } as Slot,
  recipient: { role: 'recipient', josa: '에게', cats: ANIMATE } as Slot,
  time: { role: 'time', josa: '', cats: ['time'] } as Slot,
  theme: (cats: Category[] = OBJECTS, josa = '을/를'): Slot => ({ role: 'theme', josa, cats }),
};
