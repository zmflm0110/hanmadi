// 설정·내 카드·익명 기록. 모두 이 기기의 브라우저 저장소에만 남는다(서버로 보내지 않는다).
import type { Category, NounEntry } from '../engine/lexicon';
import type { Speech } from '../engine/predicate';

export interface Settings {
  speech: Speech;
  honorListener: boolean;
  grammar: boolean; // 끄면 기존 AAC 처럼 카드 이름만 읽는다(비교 실험용)
  speakOnTap: boolean;
  clearAfterSpeak: boolean;
  scan: boolean;
  scanMs: number;
  rate: number; // 말하기 빠르기
  big: boolean; // 큰 카드
}

export const DEFAULT_SETTINGS: Settings = {
  speech: 'polite',
  honorListener: false,
  grammar: true,
  speakOnTap: true,
  clearAfterSpeak: true,
  scan: false,
  scanMs: 1500,
  rate: 0.9,
  big: false,
};

export interface MyCard {
  id: string;
  word: string;
  cat: Category;
  photo: string; // 256px JPEG data URL
}

/** 익명 사용 기록 한 줄. 이름·사진·음성은 남기지 않는다. */
export interface LogEvent {
  t: number; // ms (기록 시작 기준이 아니라 절대 시각 — 내보낼 때 상대 시각으로 바꾼다)
  type: 'add' | 'remove' | 'clear' | 'speak' | 'task';
  card?: string; // 카드 id (내 카드는 'mine' 으로만)
  rank?: number; // 말한 후보가 몇 번째였는지(0 = 1순위)
  taps?: number; // 이 문장을 만드는 데 누른 횟수
  cards?: number; // 문장의 카드 수
  ms?: number; // 첫 카드부터 말하기까지 걸린 시간
  grammar?: boolean;
  speech?: Speech;
  task?: string; // 과제 모드일 때 과제 id
  participant?: string; // 과제 모드 참가자 코드(P01 같은 익명 코드)
  text?: string; // 과제 모드에서만: 만든 문장(과제 문장이라 개인 정보가 아니다)
  match?: boolean; // 과제 모드: 기대한 뜻과 맞는지(참고용 자동 판정)
  skipped?: boolean;
}

const KEY = { settings: 'hanmadi.settings', mine: 'hanmadi.mine', log: 'hanmadi.log' };
const LOG_LIMIT = 5000;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // 개인 정보 보호 모드·저장 공간 부족: 앱은 기록 없이 계속 돈다
  }
}

export const store = {
  settings(): Settings {
    return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(KEY.settings, {}) };
  },
  saveSettings(s: Settings) {
    write(KEY.settings, s);
  },
  myCards(): MyCard[] {
    return read<MyCard[]>(KEY.mine, []);
  },
  saveMyCards(cards: MyCard[]): boolean {
    return write(KEY.mine, cards);
  },
  log(): LogEvent[] {
    return read<LogEvent[]>(KEY.log, []);
  },
  append(e: LogEvent) {
    const all = store.log();
    all.push(e);
    write(KEY.log, all.slice(-LOG_LIMIT));
  },
  clearLog() {
    write(KEY.log, []);
  },
};

export function toNoun(c: MyCard): NounEntry {
  // 사람 이름은 반말로 부를 때 '지민아'처럼 호격 조사를 붙인다
  return { kind: 'noun', id: c.id, word: c.word, cat: c.cat, callSuffix: c.cat === 'person' };
}

/** 내보내기용 요약: 말한 문장 수, 평균 누름 수, 1순위를 고른 비율(문법 켬/끔 따로) */
export function summarize(log: LogEvent[]) {
  const speaks = log.filter((e) => e.type === 'speak');
  const by = (g: boolean) => speaks.filter((e) => e.grammar === g);
  const stat = (xs: LogEvent[]) => ({
    sentences: xs.length,
    avgTaps: xs.length ? xs.reduce((s, e) => s + (e.taps ?? 0), 0) / xs.length : 0,
    avgCards: xs.length ? xs.reduce((s, e) => s + (e.cards ?? 0), 0) / xs.length : 0,
    avgSeconds: xs.length ? xs.reduce((s, e) => s + (e.ms ?? 0), 0) / xs.length / 1000 : 0,
    top1: xs.length ? xs.filter((e) => e.rank === 0).length / xs.length : 0,
  });
  return { grammarOn: stat(by(true)), grammarOff: stat(by(false)) };
}
