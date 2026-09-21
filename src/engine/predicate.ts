// 문장 자질(말투·서법·시제·높임·부정·양태)에 맞춰 서술어 전체를 만든다.
import { attachJosa } from './josa';
import { finalJong } from './hangul';
import {
  attachC,
  attachEu,
  attachFormal,
  honor,
  infinitive,
  isHonorStem,
  pastStem,
  stemOf,
  type Predicate,
} from './conjugate';

export type Speech = 'plain' | 'polite' | 'formal'; // 반말(해체) · 해요체 · 합쇼체
export type Mood = 'statement' | 'question' | 'suggest' | 'command' | 'request';
export type Tense = 'present' | 'past' | 'future';
export type Negation = 'none' | 'an' | 'mot';
export type Modality = 'none' | 'want' | 'progressive' | 'can' | 'cannot' | 'must' | 'try';

export interface Features {
  speech: Speech;
  mood: Mood;
  tense: Tense;
  honorific: boolean; // 주체 높임 -(으)시-
  negation: Negation;
  modality: Modality;
}

export const DEFAULT_FEATURES: Features = {
  speech: 'polite',
  mood: 'statement',
  tense: 'present',
  honorific: false,
  negation: 'none',
  modality: 'none',
};

const SSIPDA: Predicate = { lemma: '싶다', pos: 'adj' };
const ITDA: Predicate = { lemma: '있다', pos: 'adj' }; // '-ㄹ 수 있다'의 있다는 형용사처럼 활용(있는다 X)
const ITDA_V: Predicate = { lemma: '있다', pos: 'verb' };
const GYESIDA: Predicate = { lemma: '계시다', pos: 'verb', honorificLemma: true };
const EOPDA: Predicate = { lemma: '없다', pos: 'adj' };
const HADA: Predicate = { lemma: '하다', pos: 'verb' };
const BODA: Predicate = { lemma: '보다', pos: 'verb' };
const JUDA: Predicate = { lemma: '주다', pos: 'verb' };
const MALDA: Predicate = { lemma: '말다', pos: 'verb' };

/** -(으)시- 가 붙은 어간(가시, 드시 …) 끝의 '시'를 '세요'로: 가세요, 드세요, 주무세요 */
function seyo(p: Predicate): string {
  return stemOf(honor(p).lemma).slice(0, -1) + '세요';
}

/** 서법·말투·시제에 맞는 종결형(부정·양태는 이미 처리된 상태) */
function ending(p: Predicate, f: Features): string {
  const q = f.mood === 'question';
  if (f.mood === 'statement' || f.mood === 'question') {
    const h = f.honorific ? honor(p) : p;
    const honorStem = f.honorific || isHonorStem(p); // 계시다·드시다 는 높임 표시 없이도 '세요'
    switch (f.speech) {
      case 'plain':
        if (f.tense === 'past') return pastStem(h) + '어';
        if (f.tense === 'future') return attachEu(h, 'ㄹ 거야');
        return infinitive(h); // 먹어, 가셔
      case 'polite':
        if (f.tense === 'past') return pastStem(h) + '어요';
        if (f.tense === 'future') return attachEu(h, 'ㄹ 거예요');
        return honorStem ? seyo(p) : infinitive(h) + '요';
      case 'formal':
        if (f.tense === 'past') return pastStem(h) + (q ? '습니까' : '습니다');
        if (f.tense === 'future') return attachEu(h, q ? 'ㄹ 겁니까' : 'ㄹ 겁니다');
        return attachFormal(h, q ? '니까' : '니다');
    }
  }
  if (f.mood === 'suggest') {
    if (f.speech === 'plain') return attachC(p, '자'); // 가자, 먹자
    if (f.speech === 'polite') return attachEu(p, 'ㄹ까요'); // 갈까요, 먹을까요
    return attachFormal(p, '시다'); // 갑시다, 먹읍시다
  }
  if (f.mood === 'command') {
    if (f.speech === 'plain') return infinitive(p); // 먹어, 가
    if (f.speech === 'polite') return seyo(p); // 드세요, 가세요, 먹으세요
    return attachFormal(honor(p), '시오'); // 가십시오
  }
  // request: -아/어 주다 (주다 자체는 '주세요')
  const aux = ending(JUDA, { ...f, mood: 'command', honorific: false });
  if (p.lemma === '주다') return aux;
  return `${infinitive(p)} ${aux}`; // 먹어 주세요, 도와줘 …
}

function negPrefix(n: Negation): string {
  return n === 'an' ? '안 ' : n === 'mot' ? '못 ' : '';
}

/** 부정 붙이기: '안 가요', 명사+하다는 '공부 안 해요' */
function withNegation(p: Predicate, n: Negation, body: (p: Predicate) => string): string {
  if (n === 'none') return body(p);
  if (p.nounHada) {
    const noun = stemOf(p.lemma).slice(0, -1);
    return `${noun} ${negPrefix(n)}${body(HADA)}`;
  }
  return negPrefix(n) + body(p);
}

export function realizePredicate(p: Predicate, f: Features): string {
  const core = realizeCore(p, f);
  return f.mood === 'question' || (f.mood === 'suggest' && f.speech === 'polite') ? core + '?' : core;
}

function realizeCore(p: Predicate, f: Features): string {
  // 금지: -지 말다
  if (f.negation !== 'none' && (f.mood === 'command' || f.mood === 'suggest')) {
    const main = attachC(p, '지');
    if (f.mood === 'command') {
      if (f.speech === 'plain') return `${main} 마`;
      return `${main} ${ending(MALDA, { ...f, negation: 'none', modality: 'none' })}`; // 마세요, 마십시오
    }
    if (f.speech === 'plain') return `${main} 말자`;
    if (f.speech === 'polite') return `${main} 말아요`;
    return `${main} 맙시다`;
  }

  const rest: Features = { ...f, negation: 'none', modality: 'none' };
  switch (f.modality) {
    case 'none':
      return withNegation(p, f.negation, (q) => ending(q, f));
    case 'want':
      return withNegation(p, f.negation, (q) => `${attachC(q, '고')} ${ending(SSIPDA, rest)}`);
    case 'progressive': {
      const aux = f.honorific ? ending(GYESIDA, { ...rest, honorific: false }) : ending(ITDA_V, rest);
      return withNegation(p, f.negation, (q) => `${attachC(q, '고')} ${aux}`);
    }
    case 'can':
      return withNegation(p, f.negation, (q) => `${attachEu(q, 'ㄹ 수')} ${ending(ITDA, rest)}`);
    case 'cannot':
      return `${attachEu(p, 'ㄹ 수')} ${ending(EOPDA, rest)}`;
    case 'must':
      return withNegation(p, f.negation, (q) => `${infinitive(q)}야 ${ending(HADA, rest)}`);
    case 'try':
      return withNegation(p, f.negation, (q) => `${infinitive(q)} ${ending(BODA, rest)}`);
  }
}

// ── 이다 · 아니다 ────────────────────────────────────────────────────────
/** 명사 + 이다: 학생이에요, 의사예요, 선생님이세요, 친구였어요, 학생일 거예요 */
export function realizeCopula(noun: string, f: Features): string {
  const q = f.mood === 'question';
  const mark = q ? '?' : '';
  const vowelEnd = finalJong(noun) === '';
  if (f.negation !== 'none') {
    return `${attachJosa(noun, '이/가')} ${realizeAnida(f)}${mark}`;
  }
  const i = vowelEnd ? '' : '이'; // 의사였어요 / 친구였어요 / 학생이었어요
  if (f.honorific) {
    if (f.tense === 'past') return `${noun}${i}셨${f.speech === 'formal' ? (q ? '습니까' : '습니다') : f.speech === 'polite' ? '어요' : '어'}${mark}`;
    if (f.speech === 'formal') return `${noun}${i}십${q ? '니까' : '니다'}${mark}`;
    return `${noun}${i}${f.speech === 'polite' ? '세요' : '셔'}${mark}`;
  }
  if (f.tense === 'past') {
    const was = vowelEnd ? '였' : '이었';
    return `${noun}${was}${f.speech === 'formal' ? (q ? '습니까' : '습니다') : f.speech === 'polite' ? '어요' : '어'}${mark}`;
  }
  if (f.tense === 'future') {
    return `${noun}일 ${f.speech === 'formal' ? (q ? '겁니까' : '겁니다') : f.speech === 'polite' ? '거예요' : '거야'}${mark}`;
  }
  if (f.speech === 'formal') return `${noun}입${q ? '니까' : '니다'}${mark}`;
  if (f.speech === 'polite') return `${attachJosa(noun, '이에요/예요')}${mark}`;
  return `${attachJosa(noun, '이야/야')}${mark}`;
}

function realizeAnida(f: Features): string {
  if (f.honorific) {
    if (f.tense === 'past') return f.speech === 'formal' ? '아니셨습니다' : f.speech === 'polite' ? '아니셨어요' : '아니셨어';
    return f.speech === 'formal' ? '아니십니다' : f.speech === 'polite' ? '아니세요' : '아니셔';
  }
  if (f.tense === 'past') return f.speech === 'formal' ? '아니었습니다' : f.speech === 'polite' ? '아니었어요' : '아니었어';
  if (f.tense === 'future') return f.speech === 'formal' ? '아닐 겁니다' : f.speech === 'polite' ? '아닐 거예요' : '아닐 거야';
  return f.speech === 'formal' ? '아닙니다' : f.speech === 'polite' ? '아니에요' : '아니야';
}
