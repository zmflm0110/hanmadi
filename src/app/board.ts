// 카드판: 분류 탭과 AAC 색 구분(Fitzgerald Key 변형).
import { CORE } from '../data/core';
import pictograms from '../data/pictograms.json';
import type { Entry } from '../engine/lexicon';

export type TabId = 'core' | 'people' | 'actions' | 'feelings' | 'food' | 'things' | 'places' | 'body' | 'time' | 'questions' | 'little' | 'social' | 'mine';

export interface Tab {
  id: TabId;
  label: string;
  color: ColorKey;
}

/** Fitzgerald Key 변형: 사람 노랑, 움직임 초록, 느낌 파랑, 이름(명사) 주황, 묻기 보라, 인사 분홍, 기능 흰색·부정 빨강 */
export type ColorKey = 'person' | 'verb' | 'adj' | 'noun' | 'wh' | 'social' | 'func' | 'neg' | 'time';

export const TABS: Tab[] = [
  { id: 'core', label: '자주', color: 'func' },
  { id: 'people', label: '사람', color: 'person' },
  { id: 'actions', label: '움직임', color: 'verb' },
  { id: 'feelings', label: '느낌', color: 'adj' },
  { id: 'food', label: '먹을거리', color: 'noun' },
  { id: 'things', label: '물건', color: 'noun' },
  { id: 'places', label: '곳', color: 'noun' },
  { id: 'body', label: '몸', color: 'noun' },
  { id: 'time', label: '때', color: 'time' },
  { id: 'questions', label: '묻기', color: 'wh' },
  { id: 'little', label: '꾸밈', color: 'func' },
  { id: 'social', label: '인사', color: 'social' },
  { id: 'mine', label: '내 카드', color: 'noun' },
];

/** '자주' 탭: 신상은·박다은(2020)의 연령 공통 핵심어휘와 요구·거절 표현 */
const CORE_IDS = [
  'na', 'eomma', 'seonsaengnim', 'chingu',
  'meokda', 'gada', 'hada', 'nolda', 'boda', 'juda',
  'jota', 'silta', 'apeuda', 'maryeopda',
  'mul', 'bap', 'hwajangsil', 'swi',
  'an', 'sipda', 'juseyo', 'q', 'gachi', 'deo', 'geuman',
  'ne', 'aniyo', 'dowajwo',
  'igeo', 'yeogi', 'do', 'nae',
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

export function pictureOf(e: Entry, custom?: Record<string, string>): string | null {
  if (custom?.[e.id]) return custom[e.id]!;
  return PICTO[e.id] ? `${import.meta.env.BASE_URL}pictograms/${e.id}.png` : null;
}

export function entriesFor(tab: TabId, mine: Entry[]): Entry[] {
  if (tab === 'mine') return mine;
  if (tab === 'core') return CORE_IDS.map((id) => CORE.find((e) => e.id === id)!).filter(Boolean);
  // 움직임 탭: 동사를 먼저, '하다'와 짝지을 명사(공부·운동 …)는 뒤에
  const list = [...CORE, ...mine].filter((e) => tabOf(e) === tab);
  return [...list.filter((e) => e.kind !== 'noun'), ...list.filter((e) => e.kind === 'noun')];
}
