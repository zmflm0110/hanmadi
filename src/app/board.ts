// 카드판: 분류 탭과 AAC 색 구분(Fitzgerald Key 변형).
import { CORE } from '../data/core';
import pictograms from '../data/pictograms.json';
import type { Entry } from '../engine/lexicon';

export type TabId = 'core' | 'people' | 'actions' | 'feelings' | 'food' | 'things' | 'places' | 'body' | 'time' | 'questions' | 'little' | 'social' | 'mine';

export interface Tab {
  id: TabId;
  label: string;
  color: ColorKey;
  /** 글을 몰라도 고를 수 있게 탭마다 대표 그림(카드 id 또는 ui/…) */
  icon: string;
}

/** Fitzgerald Key 변형: 사람 노랑, 움직임 초록, 느낌 파랑, 이름(명사) 주황, 묻기 보라, 인사 분홍, 기능 흰색·부정 빨강 */
export type ColorKey = 'person' | 'verb' | 'adj' | 'noun' | 'wh' | 'social' | 'func' | 'neg' | 'time';

export const TABS: Tab[] = [
  { id: 'core', label: '시작', color: 'func', icon: 'ui/favorite' },
  { id: 'people', label: '사람', color: 'person', icon: 'chingu' },
  { id: 'actions', label: '움직임', color: 'verb', icon: 'gada' },
  { id: 'feelings', label: '느낌', color: 'adj', icon: 'gippeuda' },
  { id: 'food', label: '먹을거리', color: 'noun', icon: 'sagwa' },
  { id: 'things', label: '물건', color: 'noun', icon: 'gong' },
  { id: 'places', label: '곳', color: 'noun', icon: 'jip' },
  { id: 'body', label: '몸', color: 'noun', icon: 'son' },
  { id: 'time', label: '때', color: 'time', icon: 'jigeum' },
  { id: 'questions', label: '묻기', color: 'wh', icon: 'mwo' },
  { id: 'little', label: '꾸밈', color: 'func', icon: 'deo' },
  { id: 'social', label: '인사', color: 'social', icon: 'annyeong' },
  { id: 'mine', label: '내 카드', color: 'noun', icon: 'ui/camera' },
];

export function iconUrl(icon: string): string {
  return `${import.meta.env.BASE_URL}pictograms/${icon}.png`;
}

/**
 * 시작 판: 탭을 오가지 않고 한 화면에서 일상 문장이 되게, 품사별 줄로 고정 배치(6칸 × 6줄).
 * 근거: 어린아이는 페이지 이동에서 가장 많이 막히고(Drager 외 2003·2004), 품사별로 모아 두면 빨리 찾는다(Wilkinson 외 2019 종합).
 * 어휘는 신상은·박다은(2020)의 연령 공통 핵심어휘와 요구·거절 표현. 선생님이 처음엔 일부를 가렸다가(빈칸) 하나씩 연다.
 */
export const STARTER_COLS = 6;
export const STARTER: string[][] = [
  ['na', 'eomma', 'seonsaengnim', 'chingu', 'igeo', 'yeogi'], // 사람·가리킴
  ['meokda', 'masida', 'gada', 'nolda', 'hada', 'boda'], // 움직임
  ['jota', 'silta', 'apeuda', 'maryeopda', 'baegopeuda', 'jollida'], // 느낌
  ['mul', 'bap', 'gansik', 'hwajangsil', 'swi', 'jip'], // 먹을거리·곳
  ['an', 'sipda', 'juseyo', 'deo', 'geuman', 'q'], // 작은 말
  ['ne', 'aniyo', 'dowajwo', 'gachi', 'do', 'nae'], // 대답·도움
];

const NEG_IDS = new Set(['an', 'mot', 'jimaseyo', 'geuman', 'aniyo']);

export function tabOf(e: Entry): TabId {
  switch (e.kind) {
    case 'noun':
      if (e.wh) return 'questions';
      if (['self', 'you', 'we', 'person', 'animal'].includes(e.cat)) return 'people';
      if (e.cat === 'place') return 'places';
      if (e.cat === 'food' || e.cat === 'drink') return 'food';
      if (e.cat === 'body') return 'body';
      if (e.cat === 'time') return 'time';
      if (e.cat === 'activity') return 'actions';
      return 'things';
    case 'pred':
      return e.pos === 'adj' ? 'feelings' : 'actions';
    case 'adverb':
      return e.wh ? 'questions' : 'little';
    case 'marker':
      return 'little';
    case 'phrase':
      return 'social';
    case 'det':
    case 'num':
    case 'particle':
      return 'little';
  }
}

export function colorOf(e: Entry): ColorKey {
  if (NEG_IDS.has(e.id)) return 'neg';
  switch (e.kind) {
    case 'noun':
      if (e.wh) return 'wh';
      if (['self', 'you', 'we', 'person', 'animal'].includes(e.cat)) return 'person';
      if (e.cat === 'time') return 'time';
      return 'noun';
    case 'pred':
      return e.pos === 'adj' ? 'adj' : 'verb';
    case 'adverb':
      return e.wh ? 'wh' : 'func';
    case 'marker':
      return e.set.mood === 'question' ? 'wh' : 'func';
    case 'phrase':
      return 'social';
    case 'det':
    case 'num':
    case 'particle':
      return 'func';
  }
}

export function labelOf(e: Entry): string {
  return e.kind === 'pred' ? e.lemma : e.word;
}

const PICTO = pictograms as Record<string, { arasaac: number }>;
/** 알맞은 ARASAAC 그림이 없는 기능어는 직접 그린 기호로(글을 몰라도 알아보게) */
export const OWN_SYMBOLS: Record<string, string> = { an: 'ui/not.svg', mot: 'ui/cannot.svg', jeongmal: 'ui/really.svg', man: 'ui/only.svg', geunyang: 'ui/shrug.svg', bappeuda: 'ui/busy.svg' };

export function pictureOf(e: Entry, custom?: Record<string, string>): string | null {
  if (custom?.[e.id]) return custom[e.id]!;
  if (OWN_SYMBOLS[e.id]) return `${import.meta.env.BASE_URL}pictograms/${OWN_SYMBOLS[e.id]}`;
  return PICTO[e.id] ? `${import.meta.env.BASE_URL}pictograms/${e.id}.png` : null;
}

export function entriesFor(tab: TabId, mine: Entry[]): Entry[] {
  if (tab === 'mine') return mine;
  if (tab === 'core') return STARTER.flat().map((id) => CORE.find((e) => e.id === id)!);
  // 움직임 탭: 동사를 먼저, '하다'와 짝지을 명사(공부·운동 …)는 뒤에
  const list = [...CORE, ...mine].filter((e) => tabOf(e) === tab);
  return [...list.filter((e) => e.kind !== 'noun'), ...list.filter((e) => e.kind === 'noun')];
}
