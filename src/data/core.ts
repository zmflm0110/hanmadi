// 첫 핵심 어휘. 근거: 신상은·박다은(2020) 국내 AAC 핵심어휘 문헌고찰의 공통 어휘(나, 엄마, 물, 집, 가-, 먹-, 보-, 하-, 있-, 없- …)에
// 학교·가정의 요구 표현(화장실, 아프다, 도와주다 …)을 더했다. 격틀은 표준국어대사전의 문형 정보를 따라 손으로 적었다.
import { ANIMATE, EDIBLE, OBJECTS, PEOPLE, S, type Category, type Entry, type NounEntry, type PredEntry } from '../engine/lexicon';

const ALL: Category[] = ['self', 'you', 'we', 'person', 'animal', 'place', 'food', 'drink', 'thing', 'toy', 'vehicle', 'body', 'clothes', 'activity'];

const n = (id: string, word: string, cat: Category, extra: Partial<NounEntry> = {}): NounEntry => ({ kind: 'noun', id, word, cat, ...extra });
const p = (id: string, lemma: string, pos: 'verb' | 'adj', frame: PredEntry['frame'], extra: Partial<PredEntry> = {}): PredEntry => ({ kind: 'pred', id, lemma, pos, frame, ...extra });

export const CORE: Entry[] = [
  // ── 사람 ──
  n('na', '나', 'self'),
  n('neo', '너', 'you'),
  n('uri', '우리', 'we'),
  n('eomma', '엄마', 'person'),
  n('appa', '아빠', 'person'),
  n('halmeoni', '할머니', 'person', { honorific: true }),
  n('harabeoji', '할아버지', 'person', { honorific: true }),
  n('seonsaengnim', '선생님', 'person', { honorific: true }),
  n('chingu', '친구', 'person'),
  n('dongsaeng', '동생', 'person'),
  n('hyeong', '형', 'person'),
  n('nuna', '누나', 'person'),
  n('eonni', '언니', 'person'),
  n('oppa', '오빠', 'person'),
  n('agi', '아기', 'person'),
  n('gangaji', '강아지', 'animal'),
  n('goyangi', '고양이', 'animal'),

  // ── 곳 ──
  n('jip', '집', 'place', { honorForm: '댁' }),
  n('hakgyo', '학교', 'place'),
  n('hwajangsil', '화장실', 'place'),
  n('byeongwon', '병원', 'place'),
  n('gongwon', '공원', 'place'),
  n('noriteo', '놀이터', 'place'),
  n('gyosil', '교실', 'place'),
  n('sikdang', '식당', 'place'),
  n('mateu', '마트', 'place'),
  n('bang', '방', 'place'),
  n('bak', '밖', 'place'),

  // ── 먹을거리 ──
  n('bap', '밥', 'food', { honorForm: '진지' }),
  n('ppang', '빵', 'food'),
  n('gwaja', '과자', 'food'),
  n('sagwa', '사과', 'food'),
  n('banana', '바나나', 'food'),
  n('ramyeon', '라면', 'food'),
  n('gimbap', '김밥', 'food'),
  n('gogi', '고기', 'food'),
  n('aiseukeurim', '아이스크림', 'food'),
  n('mul', '물', 'drink'),
  n('uyu', '우유', 'drink'),
  n('juseu', '주스', 'drink'),

  // ── 물건 ──
  n('chaek', '책', 'thing'),
  n('yeonpil', '연필', 'thing'),
  n('gabang', '가방', 'thing'),
  n('hyudaepon', '휴대폰', 'thing'),
  n('tv', '텔레비전', 'thing'),
  n('keompyuteo', '컴퓨터', 'thing'),
  n('gong', '공', 'toy'),
  n('inhyeong', '인형', 'toy'),
  n('beullok', '블록', 'toy'),
  n('ot', '옷', 'clothes'),
  n('sinbal', '신발', 'clothes'),
  n('mun', '문', 'thing'),
  n('bul', '불', 'thing'),
  n('eumak', '음악', 'thing'),

  // ── 탈것 ──
  n('beoseu', '버스', 'vehicle'),
  n('cha', '차', 'vehicle'),
  n('jihacheol', '지하철', 'vehicle'),
  n('jajeongeo', '자전거', 'vehicle'),

  // ── 몸 ──
  n('meori', '머리', 'body'),
  n('bae', '배', 'body'),
  n('dari', '다리', 'body'),
  n('son', '손', 'body'),
  n('nun', '눈', 'body'),
  n('mok', '목', 'body'),

  // ── 하는 일(명사) ──
  n('gongbu', '공부', 'activity'),
  n('undong', '운동', 'activity'),
  n('sukje', '숙제', 'activity'),
  n('cheongso', '청소', 'activity'),
  n('geim', '게임', 'activity'),
  n('norae', '노래', 'activity'),
  n('geurim', '그림', 'activity'),

  // ── 때 ──
  n('jigeum', '지금', 'time', { timeJosa: '', tense: 'present' }),
  n('oneul', '오늘', 'time', { timeJosa: '' }),
  n('eoje', '어제', 'time', { timeJosa: '', tense: 'past' }),
  n('naeil', '내일', 'time', { timeJosa: '', tense: 'future' }),
  n('akka', '아까', 'time', { timeJosa: '', tense: 'past' }),
  n('ittaga', '이따가', 'time', { timeJosa: '', tense: 'future' }),
  // 아침·점심·저녁은 때이면서 끼니: 아침에 먹어요 / 아침을 먹어요
  n('achim', '아침', 'time', { timeJosa: '에', alt: ['food'] }),
  n('jeomsim', '점심', 'time', { timeJosa: '에', alt: ['food'] }),
  n('jeonyeok', '저녁', 'time', { timeJosa: '에', alt: ['food'] }),
  n('jumal', '주말', 'time', { timeJosa: '에' }),

  // ── 묻는 말 ──
  n('mwo', '뭐', 'thing', { wh: true }),
  n('nugu', '누구', 'person', { wh: true }),
  n('eodi', '어디', 'place', { wh: true }),
  n('eonje', '언제', 'time', { wh: true, timeJosa: '' }),

  // ── 움직임 ──
  p('gada', '가다', 'verb', [S.time, S.agent, S.goal, S.companion, S.instrument], { motion: true }),
  p('oda', '오다', 'verb', [S.time, S.agent, S.source, S.goal, S.companion, S.instrument], { motion: true }),
  p('meokda', '먹다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme(EDIBLE)], { honorLemma: '드시다' }),
  p('masida', '마시다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme(['drink'])], { honorLemma: '드시다' }),
  p('jada', '자다', 'verb', [S.time, S.agent, S.location, S.companion], { honorLemma: '주무시다' }),
  p('nolda', '놀다', 'verb', [S.time, S.agent, S.location, S.companion, S.instrument]),
  p('boda', '보다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme([...OBJECTS, 'person', 'activity'])]),
  p('mannada', '만나다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme(PEOPLE)]),
  p('salda', '살다', 'verb', [S.time, S.agent, S.locationAt, S.companion]),
  p('juda', '주다', 'verb', [S.time, S.agent, S.recipient, S.theme()], { humbleLemma: '드리다' }),
  p('sada', '사다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme()]),
  p('ssitda', '씻다', 'verb', [S.time, S.agent, S.location, S.theme(['body', 'food', 'thing', 'toy'])]),
  p('tada', '타다', 'verb', [S.time, S.agent, S.companion, S.theme(['vehicle'])]),
  p('anjda', '앉다', 'verb', [S.time, S.agent, S.locationAt]),
  p('ikda', '읽다', 'verb', [S.time, S.agent, S.location, S.theme(['thing'])]),
  p('hada', '하다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme(['activity'])]),
  p('gongbuhada', '공부하다', 'verb', [S.time, S.agent, S.location, S.companion], { nounHada: true }),
  p('undonghada', '운동하다', 'verb', [S.time, S.agent, S.location, S.companion], { nounHada: true }),
  p('jeonhwahada', '전화하다', 'verb', [S.time, S.agent, S.recipient], { nounHada: true }),
  p('dopda', '돕다', 'verb', [S.time, S.agent, S.theme(PEOPLE)]),
  p('gidarida', '기다리다', 'verb', [S.time, S.agent, S.location, S.theme([...PEOPLE, 'vehicle'])]),
  p('ulda', '울다', 'verb', [S.time, S.agent]),
  p('utda', '웃다', 'verb', [S.time, S.agent]),
  p('ssauda', '싸우다', 'verb', [S.time, S.agent, S.companion]),
  p('mandeulda', '만들다', 'verb', [S.time, S.agent, S.location, S.companion, S.theme()]),
  p('deutda', '듣다', 'verb', [S.time, S.agent, S.theme(['thing', 'activity'])]),
  p('ipda', '입다', 'verb', [S.time, S.agent, S.theme(['clothes'])]),
  p('beotda', '벗다', 'verb', [S.time, S.agent, S.theme(['clothes'])]),
  p('yeolda', '열다', 'verb', [S.time, S.agent, S.theme(['thing'])]),
  p('datda', '닫다', 'verb', [S.time, S.agent, S.theme(['thing'])]),
  p('kyeoda', '켜다', 'verb', [S.time, S.agent, S.theme(['thing'])]),
  p('kkeuda', '끄다', 'verb', [S.time, S.agent, S.theme(['thing'])]),
  p('bureuda', '부르다', 'verb', [S.time, S.agent, S.companion, S.theme(['activity', ...PEOPLE])]),
  p('geurida', '그리다', 'verb', [S.time, S.agent, S.companion, S.theme(['activity'])]),
  p('johahada', '좋아하다', 'verb', [S.agent, S.theme(ALL)]),
  p('sireohada', '싫어하다', 'verb', [S.agent, S.theme(ALL)]),
  p('saranghada', '사랑하다', 'verb', [S.agent, S.theme(ANIMATE)]),
  p('alda', '알다', 'verb', [S.agent, S.theme(ALL)]),
  p('moreuda', '모르다', 'verb', [S.agent, S.theme(ALL)]),
  p('swida', '쉬다', 'verb', [S.time, S.agent, S.location]),
  p('ireonada', '일어나다', 'verb', [S.time, S.agent]),
  p('nupda', '눕다', 'verb', [S.time, S.agent, S.locationAt]),
  p('geotda', '걷다', 'verb', [S.time, S.agent, S.companion]),
  p('ttwida', '뛰다', 'verb', [S.time, S.agent, S.location]),
  p('malhada', '말하다', 'verb', [S.time, S.agent, S.recipient], { honorLemma: '말씀하시다' }),
  p('hwanada', '화나다', 'verb', [S.time, S.experiencer]),

  // ── 있음 ──
  p('itda', '있다', 'adj', [S.time, S.experiencer, S.locationAt, { role: 'agent', josa: '이/가', cats: ALL }], { honorLemma: '계시다' }),
  p('eopda', '없다', 'adj', [S.time, S.experiencer, S.locationAt, { role: 'agent', josa: '이/가', cats: ALL }]),

  // ── 느낌·상태 ──
  p('jota', '좋다', 'adj', [S.experiencer, S.theme(ALL, '이/가')]),
  p('silta', '싫다', 'adj', [S.experiencer, S.theme(ALL, '이/가')]),
  p('apeuda', '아프다', 'adj', [S.time, S.experiencer, S.theme(['body'], '이/가')]),
  p('baegopeuda', '배고프다', 'adj', [S.time, S.experiencer]),
  p('mongmareuda', '목마르다', 'adj', [S.time, S.experiencer]),
  p('jollida', '졸리다', 'adj', [S.time, S.experiencer]),
  p('deopda', '덥다', 'adj', [S.time, S.experiencer, S.theme(['place'], '이/가')]),
  p('chupda', '춥다', 'adj', [S.time, S.experiencer, S.theme(['place'], '이/가')]),
  p('masitda', '맛있다', 'adj', [S.theme(EDIBLE, '이/가')]),
  p('maseopda', '맛없다', 'adj', [S.theme(EDIBLE, '이/가')]),
  p('keuda', '크다', 'adj', [S.theme(ALL, '이/가')]),
  p('jakda', '작다', 'adj', [S.theme(ALL, '이/가')]),
  p('museopda', '무섭다', 'adj', [S.experiencer, S.theme(ALL, '이/가')]),
  p('jaemiitda', '재미있다', 'adj', [S.experiencer, S.theme(ALL, '이/가')]),
  p('simsimhada', '심심하다', 'adj', [S.time, S.experiencer]),
  p('gippeuda', '기쁘다', 'adj', [S.time, S.experiencer]),
  p('seulpeuda', '슬프다', 'adj', [S.time, S.experiencer]),
  p('pigonhada', '피곤하다', 'adj', [S.time, S.experiencer]),
  p('gwaenchanta', '괜찮다', 'adj', [S.experiencer, S.theme(ALL, '이/가')]),
  p('piryohada', '필요하다', 'adj', [S.experiencer, S.theme(ALL, '이/가')]),
  p('yeppeuda', '예쁘다', 'adj', [S.theme(ALL, '이/가')]),
  p('tteugeopda', '뜨겁다', 'adj', [S.theme(ALL, '이/가')]),
  p('chagapda', '차갑다', 'adj', [S.theme(ALL, '이/가')]),

  // ── 기능 카드 ──
  { kind: 'marker', id: 'an', word: '안', set: { negation: 'an' } },
  { kind: 'marker', id: 'mot', word: '못', set: { negation: 'mot' } },
  { kind: 'marker', id: 'q', word: '?', set: { mood: 'question' } },
  { kind: 'marker', id: 'juseyo', word: '주세요', set: { mood: 'request' } },
  { kind: 'marker', id: 'gachi', word: '같이', set: { mood: 'suggest' }, surface: '같이' },
  { kind: 'marker', id: 'halkkayo', word: '할까요?', set: { mood: 'suggest' } },
  { kind: 'marker', id: 'sipda', word: '싶어요', set: { modality: 'want' } },
  { kind: 'marker', id: 'suitda', word: '할 수 있어요', set: { modality: 'can' } },
  { kind: 'marker', id: 'haeya', word: '해야 해요', set: { modality: 'must' } },
  { kind: 'marker', id: 'jungida', word: '하는 중', set: { modality: 'progressive' } },
  { kind: 'marker', id: 'boda-try', word: '해 볼래요', set: { modality: 'try' } },
  { kind: 'marker', id: 'jimaseyo', word: '하지 마세요', set: { mood: 'command', negation: 'an' } },
  { kind: 'marker', id: 'haseyo', word: '하세요', set: { mood: 'command' } },
  { kind: 'marker', id: 'past', word: '했어요', set: { tense: 'past' } },
  { kind: 'marker', id: 'promise', word: '할게요', set: { mood: 'promise' } },
  { kind: 'marker', id: 'volition', word: '할래요', set: { mood: 'volition' } },
  { kind: 'marker', id: 'future', word: '할 거예요', set: { tense: 'future' } },

  // ── 꾸미는 말 ──
  { kind: 'adverb', id: 'ppalli', word: '빨리' },
  { kind: 'adverb', id: 'cheoncheonhi', word: '천천히' },
  { kind: 'adverb', id: 'mani', word: '많이' },
  { kind: 'adverb', id: 'jogeum', word: '조금' },
  { kind: 'adverb', id: 'deo', word: '더' },
  { kind: 'adverb', id: 'tto', word: '또' },
  { kind: 'adverb', id: 'neomu', word: '너무' },
  { kind: 'adverb', id: 'jeongmal', word: '정말' },
  { kind: 'adverb', id: 'honja', word: '혼자' },
  { kind: 'adverb', id: 'wae', word: '왜', wh: true },

  // ── 인사·대답 ──
  { kind: 'phrase', id: 'annyeong', word: '안녕', plain: '안녕', polite: '안녕하세요', formal: '안녕하십니까' },
  { kind: 'phrase', id: 'gomawo', word: '고마워요', plain: '고마워', polite: '고마워요', formal: '감사합니다' },
  { kind: 'phrase', id: 'mianhae', word: '미안해요', plain: '미안해', polite: '미안해요', formal: '죄송합니다' },
  { kind: 'phrase', id: 'ne', word: '네', plain: '응', polite: '네', formal: '예' },
  { kind: 'phrase', id: 'aniyo', word: '아니요', plain: '아니', polite: '아니요', formal: '아닙니다' },
  { kind: 'phrase', id: 'saranghae', word: '사랑해요', plain: '사랑해', polite: '사랑해요', formal: '사랑합니다' },
  { kind: 'phrase', id: 'dowajwo', word: '도와주세요', plain: '도와줘', polite: '도와주세요', formal: '도와주십시오' },
  { kind: 'phrase', id: 'jalja', word: '잘 자요', plain: '잘 자', polite: '잘 자요', formal: '안녕히 주무세요' },
];

export const BY_ID = new Map(CORE.map((e) => [e.id, e]));

export function entry(id: string): Entry {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`사전에 없는 카드: ${id}`);
  return e;
}
