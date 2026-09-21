// 카드 나열 → 문장 후보.
//
// 원칙: 뜻은 사용자가, 문법은 엔진이. 엔진은 조사·어미·높임만 더하고 내용어를 지어내지 않는다.
// 그래서 출력은 낱말(Token)마다 어느 카드에서 왔는지(sources)를 달고 나온다. 출처 없는 토큰은 문법 요소뿐이다.
import { attachC, attachEu, type Predicate } from './conjugate';
import { finalJong } from './hangul';
import { josaFor } from './josa';
import type { AdverbEntry, Category, Entry, MarkerEntry, NounEntry, PhraseEntry, PredEntry, Role, Slot } from './lexicon';
import { DEFAULT_FEATURES, realizeCopula, realizePredicate, type Features, type Speech } from './predicate';

export interface Card {
  /** 화면의 카드 하나. 같은 낱말 카드를 두 번 놓을 수 있으니 key 로 구분한다. */
  key: string;
  entry: Entry;
}

export interface Token {
  text: string;
  sources: string[]; // 카드 key. 비어 있으면 문법 요소(조사·어미·문장부호)
  role?: Role | 'vocative' | 'predicate' | 'adverb' | 'phrase' | 'fragment';
}

export interface Candidate {
  text: string;
  tokens: Token[];
  features: Features;
  score: number;
  /** 사람이 읽을 해석: '할머니가 하는 일을 말하기' */
  note: string;
  /** 문장에 반영하지 못한 카드(서술어 없이 [싶어요]만 있을 때 등) */
  unused: string[];
}

export interface Context {
  speech: Speech;
  /** 듣는 이가 높일 분(선생님·어른)이면 듣는 이에게 묻거나 권할 때 -(으)시-: 괜찮으세요? 뭐 드실래요? */
  honorListener?: boolean;
}

const ROLE_RANK: Record<Role, number> = {
  time: 0,
  experiencer: 1,
  agent: 2,
  source: 3,
  location: 4,
  goal: 5,
  companion: 6,
  recipient: 7,
  instrument: 8,
  theme: 9,
};
const SUBJECT_ROLES = new Set<Role>(['agent', 'experiencer']);
const SHARED_ROLES = new Set<Role>(['time', 'agent', 'experiencer', 'companion']);
const PRONOUNS = new Set<Category>(['self', 'you', 'we']);
// '뭐'가 들어갈 수 있는 자리: 사물·일. 하는 이·함께하는 이 같은 생물 자리는 안 된다(뭐가 해요? ✗)
const WHAT_CATS = new Set<Category>(['food', 'drink', 'thing', 'toy', 'clothes', 'vehicle', 'body', 'activity']);

interface OwnedSlot extends Slot {
  owner: number; // 서술어 번호(0 = 앞 동사, 1 = 주 서술어)
}

interface NounCard {
  key: string;
  e: NounEntry;
  pos: number; // 카드 순서
}

interface Assignment {
  slots: (OwnedSlot | null)[];
  score: number;
}

function compatible(n: NounEntry, s: Slot): boolean {
  if (n.wh) {
    if (n.word === '뭐') return s.role !== 'time' && s.cats.some((c) => WHAT_CATS.has(c));
    if (n.word === '누구') return s.cats.includes('person');
    if (n.word === '어디') return s.cats.includes('place') || s.cats.includes('body'); // 어디가 아파요?
  }
  return s.cats.includes(n.cat) || !!n.alt?.some((c) => s.cats.includes(c));
}

/** 명사들을 격틀 자리에 배정하는 모든 경우를 따져 점수 높은 순으로 */
function assign(nouns: NounCard[], slots: OwnedSlot[], predPos: number[], mood: Features['mood']): Assignment[] {
  const asking = mood === 'question' || mood === 'volitionQ';
  const directive = mood === 'command' || mood === 'request';
  const out: Assignment[] = [];
  const cur: (OwnedSlot | null)[] = [];
  const used = new Set<number>();

  const score = (): number => {
    let s = 0;
    cur.forEach((slot, i) => {
      const n = nouns[i]!;
      if (!slot) {
        s -= 2;
        return;
      }
      s += 3 + 1 / slot.cats.length;
      if (SUBJECT_ROLES.has(slot.role)) {
        s += PRONOUNS.has(n.e.cat) ? 1.5 : n.e.cat === 'person' ? 0.5 : 0;
        // 평서문의 주어는 대개 말하는 나, 묻거나 시킬 때 주어는 대개 듣는 너
        if (n.e.cat === 'you' && !asking && !directive) s -= 1;
        if ((n.e.cat === 'self' || n.e.cat === 'we') && (asking || directive)) s -= 1;
      }
      // 때 낱말이 끼니 자리(아침을 먹다)로 쓰이는 건 드물지 않지만 기본은 때
      if (n.e.cat === 'time' && slot.role !== 'time') s -= 0.8;
      // 두 서술어: 앞 동사보다 먼저 놓인 명사는 앞 동사, 뒤는 주 서술어 쪽이 자연스럽다
      if (predPos.length === 2 && !SHARED_ROLES.has(slot.role)) {
        const beforeV1 = n.pos < predPos[0]!;
        if ((slot.owner === 0) === beforeV1) s += 0.3;
        // '놀러 가요' 같은 목적 구문에서 장소는 이동 동사의 목적지로: 공원에 놀러 가요
        if (slot.role === 'goal' && slot.owner === 1) s += 0.5;
      }
    });
    // 주어 자리가 비었는데 대명사(나·너·우리)가 다른 자리에 가 있으면 어색하다: '학교에 저랑 가요'
    const filled = new Set(cur.filter(Boolean).map((x) => `${x!.owner}:${x!.role}`));
    const subjectOpen = !filled.has('1:agent') && !filled.has('1:experiencer');
    cur.forEach((slot, i) => {
      if (slot && subjectOpen && PRONOUNS.has(nouns[i]!.e.cat) && !SUBJECT_ROLES.has(slot.role)) s -= 2;
    });
    // 있다·없다: 가진 이(experiencer)만 있고 있는 것(agent)이 비면 '할머니는 댁에 있으세요' 같은 오독
    if (slots.some((x) => x.owner === 1 && x.role === 'agent') && slots.some((x) => x.owner === 1 && x.role === 'experiencer')) {
      if (filled.has('1:experiencer') && !filled.has('1:agent')) s -= 1.5;
    }
    for (let i = 0; i < cur.length; i++)
      for (let j = i + 1; j < cur.length; j++) {
        const a = cur[i];
        const b = cur[j];
        if (a && b) s += ROLE_RANK[a.role] <= ROLE_RANK[b.role] ? 0.4 : -0.2;
      }
    return s;
  };

  const walk = (i: number) => {
    if (i === nouns.length) {
      out.push({ slots: [...cur], score: score() });
      return;
    }
    const n = nouns[i]!.e;
    let placed = false;
    slots.forEach((s, k) => {
      if (!compatible(n, s)) return;
      if (used.has(k) && s.role !== 'time') return;
      placed = true;
      used.add(k);
      cur.push(s);
      walk(i + 1);
      cur.pop();
      if (s.role !== 'time') used.delete(k);
    });
    if (!placed || nouns.length <= 3) {
      cur.push(null);
      walk(i + 1);
      cur.pop();
    }
  };
  walk(0);
  out.sort((a, b) => b.score - a.score);
  // 같은 배정(역할 집합이 같음)은 하나만
  const seen = new Set<string>();
  return out.filter((a) => {
    const sig = a.slots.map((s) => (s ? `${s.owner}:${s.role}` : '-')).join('|');
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

// ── 명사 + 조사 ──────────────────────────────────────────────────────────
interface NounStyle {
  speech: Speech;
  honorSubject: boolean; // 주체가 높임 대상
  isSubject: boolean;
  topic: boolean; // 은/는 으로
  /** 청유문의 '우리'는 듣는 이를 포함하므로 '저희'로 낮추지 않는다(저희는 듣는 이를 뺀 우리) */
  inclusiveWe?: boolean;
}

const GA_CONTRACT: Record<string, string> = { 나: '내가', 저: '제가', 너: '네가', 누구: '누가' };

function surfaceWord(n: NounEntry, role: Role | null, st: NounStyle): string {
  if (st.speech !== 'plain') {
    if (n.cat === 'self') return '저';
    if (n.cat === 'we' && !st.inclusiveWe) return '저희';
  }
  if (st.honorSubject && !st.isSubject && n.honorForm && role && ['theme', 'goal', 'location', 'source'].includes(role)) return n.honorForm;
  return n.word;
}

function renderNoun(n: NounEntry, slot: Slot | null, st: NounStyle, honorRecipient: boolean): string {
  const word = surfaceWord(n, slot?.role ?? null, st);
  if (!slot) return word;
  if (slot.role === 'time') return word + (n.timeJosa ?? '');
  if (n.wh) {
    const formal = st.speech === 'formal';
    if (n.word === '누구') {
      if (slot.josa === '이/가') return '누가';
      if (slot.role === 'companion') return formal ? '누구와' : '누구랑';
      if (slot.role === 'recipient') return formal ? '누구에게' : '누구한테';
      return '누구를';
    }
    if (n.word === '뭐') {
      if (slot.josa === '이/가') return formal ? '무엇이' : '뭐가'; // 뭐가 좋아?
      if (slot.role === 'instrument') return formal ? '무엇으로' : '뭘로';
      return formal ? '무엇을' : '뭐'; // 뭐 먹어요? / 무엇을 드십니까?
    }
    if (n.word === '어디') {
      if (slot.role === 'goal') return formal ? '어디에' : '어디'; // 어디 가요?
      if (slot.josa === '에서') return formal ? '어디에서' : '어디서'; // 어디서 왔어요?
      if (slot.josa === '이/가') return '어디가'; // 어디가 아파요?
      return '어디에'; // 어디에 있어요?
    }
    return word; // 언제 와요?
  }
  let josa = st.topic ? '은/는' : slot.josa;
  if (josa === '이/가' && st.isSubject && st.honorSubject && st.speech === 'formal') josa = '께서';
  if (slot.role === 'recipient') josa = honorRecipient ? '께' : st.speech === 'plain' ? '한테' : '에게';
  if (st.speech === 'formal' && josa === '이랑/랑') josa = '과/와';
  if (josa === '이/가' && GA_CONTRACT[word]) return GA_CONTRACT[word]!;
  if (josa === '') return word;
  return word + josaFor(word, josa);
}

// ── 문장 조립 ────────────────────────────────────────────────────────────
function textOf(tokens: Token[]): string {
  let s = '';
  for (const t of tokens) {
    if (t.role === 'vocative') {
      s += `${t.text}, `;
      continue;
    }
    if (t.text === '.' || t.text === '?') {
      s = s.trimEnd() + t.text;
      continue;
    }
    s += (s && !s.endsWith(' ') ? ' ' : '') + t.text;
  }
  s = s.trim();
  if (!/[.?!]$/.test(s)) s += '.';
  return s;
}

function toPredicate(e: PredEntry, lemma = e.lemma, honorificLemma = false): Predicate {
  return { lemma, pos: e.pos, conj: lemma === e.lemma ? e.conj : undefined, nounHada: lemma === e.lemma ? e.nounHada : false, honorificLemma };
}

function applyMarkers(base: Features, markers: { key: string; e: MarkerEntry }[]): Features {
  const f = { ...base };
  for (const { e } of markers) Object.assign(f, e.set);
  return f;
}

export function realize(cards: Card[], ctx: Context, limit = 5): Candidate[] {
  const nouns: NounCard[] = [];
  const preds: { key: string; e: PredEntry; pos: number }[] = [];
  const markers: { key: string; e: MarkerEntry; pos: number }[] = [];
  const adverbs: { key: string; e: AdverbEntry; pos: number }[] = [];
  const phrases: { key: string; e: PhraseEntry }[] = [];
  cards.forEach((c, pos) => {
    const e = c.entry;
    if (e.kind === 'noun') nouns.push({ key: c.key, e, pos });
    else if (e.kind === 'pred') preds.push({ key: c.key, e, pos });
    else if (e.kind === 'marker') markers.push({ key: c.key, e, pos });
    else if (e.kind === 'adverb') adverbs.push({ key: c.key, e, pos });
    else phrases.push({ key: c.key, e });
  });

  let features: Features = applyMarkers({ ...DEFAULT_FEATURES, speech: ctx.speech }, markers);
  // 때 낱말이 시제를 정한다(어제→과거, 내일→미래). 단 바람·가능·의무는 지금의 마음이라 그대로 둔다: 내일 만나고 싶어요
  let tenseFromTime = false;
  if (!markers.some((m) => m.e.set.tense) && ['none', 'progressive', 'try'].includes(features.modality)) {
    const t = nouns.find((n) => n.e.tense)?.e.tense;
    if (t) {
      features.tense = t;
      tenseFromTime = t === 'future';
    }
  }
  if (features.mood === 'question' && markers.some((m) => m.e.set.mood === 'volition')) features.mood = 'volitionQ';
  if (features.mood === 'volition' && markers.some((m) => m.e.set.mood === 'question')) features.mood = 'volitionQ';
  const hasWh = nouns.some((n) => n.e.wh) || adverbs.some((a) => a.e.wh);
  if (hasWh && features.mood === 'statement') features.mood = 'question';

  const phraseTokens: Token[] = phrases.map((p) => ({ text: p.e[ctx.speech], sources: [p.key], role: 'phrase' }));
  if (phrases.length && !nouns.length && !preds.length) {
    const text = phraseTokens.map((t) => t.text).join(' ');
    return [{ text: /[.?!]$/.test(text) ? text : text + '.', tokens: phraseTokens, features, score: 10, note: '인사·대답', unused: markers.map((m) => m.key).concat(adverbs.map((a) => a.key)) }];
  }
  const withPhrases = (c: Candidate): Candidate =>
    phrases.length ? { ...c, tokens: [...phraseTokens, { text: '.', sources: [] }, ...c.tokens], text: `${phraseTokens.map((t) => t.text).join(' ')}. ${c.text}` } : c;

  if (!preds.length) return nounOnly(nouns, markers, adverbs, features).map(withPhrases).slice(0, limit);

  // 서술어가 셋 이상이면 마지막 둘만 잇는다(앞의 것은 unused)
  const usedPreds = preds.slice(-2);
  const unusedPreds = preds.slice(0, -2).map((p) => p.key);
  const main = usedPreds[usedPreds.length - 1]!;
  const first = usedPreds.length === 2 ? usedPreds[0]! : null;

  const slots: OwnedSlot[] = [];
  const addFrame = (frame: Slot[], owner: number) => {
    for (const s of frame) {
      if (SHARED_ROLES.has(s.role) && slots.some((x) => x.role === s.role)) continue;
      slots.push({ ...s, owner });
    }
  };
  addFrame(main.e.frame, 1);
  if (first) addFrame(first.e.frame, 0);

  const assignments = assign(nouns, slots, usedPreds.map((p) => p.pos), features.mood).slice(0, 3);
  const candidates: Candidate[] = [];

  assignments.forEach((a, rank) => {
    const roleOf = (i: number) => a.slots[i]?.role ?? null;
    const subjIdx = nouns.findIndex((_, i) => roleOf(i) === 'agent');
    const expIdx = nouns.findIndex((_, i) => roleOf(i) === 'experiencer');
    const subjectIdx = subjIdx >= 0 ? subjIdx : expIdx;
    const subject = subjectIdx >= 0 ? nouns[subjectIdx]! : null;
    // 높임: 하는 이든 가진/느끼는 이든 주어 자리에 높일 사람이 있으면 -(으)시-
    const honorSubject = [subjIdx, expIdx].some((i) => i >= 0 && !!nouns[i]!.e.honorific);
    const recipientIdx = nouns.findIndex((_, i) => roleOf(i) === 'recipient');
    const honorRecipient = recipientIdx >= 0 && !!nouns[recipientIdx]!.e.honorific;

    // 듣는 이 높임: 주어가 '너'이거나 없고, 듣는 이에게 묻거나 시킬 때
    const listenerDirected = (!subject || subject.e.cat === 'you') && ['question', 'volitionQ', 'command', 'request'].includes(features.mood);
    const honorListener = !!ctx.honorListener && listenerDirected;

    const build = (opts: { vocative: boolean; omitSubject: boolean; topicSubject: boolean; tense?: Features['tense'] }): Candidate => {
      const f: Features = { ...features, tense: opts.tense ?? features.tense };
      if (opts.vocative) {
        if (f.mood === 'statement') f.mood = 'command';
        f.honorific = false;
        // 높일 사람을 부르며 반말로 시키지 않는다: '할머니, 진지 드셔' ✗
        if (subject?.e.honorific && f.speech === 'plain') f.speech = 'polite';
      } else {
        f.honorific = (honorSubject && ['statement', 'question', 'volitionQ'].includes(f.mood)) || (honorListener && (f.mood === 'question' || f.mood === 'volitionQ'));
      }
      // 서술어 낱말 고르기(드시다·계시다·드리다)
      const mainPred = (() => {
        const e = main.e;
        const subjectInAgent = (subjIdx >= 0 && nouns[subjIdx]!.e.honorific) || honorListener;
        if (honorRecipient && e.humbleLemma) return toPredicate(e, e.humbleLemma);
        if (e.honorLemma && subjectInAgent && (f.honorific || opts.vocative || f.mood === 'command' || f.mood === 'request')) return toPredicate(e, e.honorLemma, true);
        return toPredicate(e);
      })();

      const tokens: Token[] = [];
      const unused: string[] = [...unusedPreds];
      // 어순은 사용자가 놓은 카드 순서를 따른다(한국어는 조사가 역할을 말해 주므로 어순이 자유롭고, 강조는 사용자의 뜻이다).
      // 서술어만 늘 끝으로 보낸다.
      const order = nouns
        .map((n, i) => ({ n, i, slot: a.slots[i] ?? null }))
        .filter(({ i }) => !(opts.vocative && i === subjectIdx));
      const extras: { pos: number; token: Token }[] = [
        ...markers.filter((m) => m.e.surface).map((m) => ({ pos: m.pos, token: { text: m.e.surface!, sources: [m.key], role: 'adverb' as const } })),
        ...adverbs.map((ad) => ({ pos: ad.pos, token: { text: ad.e.word, sources: [ad.key], role: 'adverb' as const } })),
      ];
      // 두 서술어: 앞 동사에 딸린 말과 주어·때는 앞 동사 앞에, 카드를 앞 동사 뒤에 놓은 주 서술어의 말은 뒤에: 저녁 먹으러 식당에 갔어요
      const placed: { pos: number; token: Token; late?: boolean }[] = [];
      const late = (pos: number, slot: OwnedSlot | null) => !!first && pos > first.pos && (!slot || (slot.owner === 1 && !SHARED_ROLES.has(slot.role)));

      if (opts.vocative && subject) tokens.push({ text: subject.e.word, sources: [subject.key], role: 'vocative' });
      for (const { n, i, slot } of order) {
        const isSubject = i === subjectIdx;
        if (isSubject && opts.omitSubject) {
          placed.push({ pos: n.pos, token: { text: '', sources: [n.key], role: slot?.role } }); // 생략했지만 뜻은 반영됨
          continue;
        }
        const topic = isSubject && opts.topicSubject && slot?.josa === '이/가' && !n.e.wh;
        // 청유·명령에서 '우리'는 조사 없이: 우리 같이 가자
        const bareWe = isSubject && n.e.cat === 'we' && (f.mood === 'suggest' || f.mood === 'command');
        const style: NounStyle = { speech: f.speech, honorSubject, isSubject, topic, inclusiveWe: f.mood === 'suggest' };
        const text = bareWe ? surfaceWord(n.e, null, style) : renderNoun(n.e, slot, style, honorRecipient);
        placed.push({ pos: n.pos, token: { text, sources: [n.key], role: slot?.role }, late: late(n.pos, slot) });
      }
      const all = [...placed, ...extras.map((x) => ({ ...x, late: !!first && x.pos > first.pos }))].sort((p, q) => p.pos - q.pos);
      for (const x of all) if (!x.late) tokens.push(x.token);

      const markerKeys = markers.filter((m) => !m.e.surface).map((m) => m.key);
      if (first) {
        const p0 = toPredicate(first.e);
        const link = main.e.motion ? attachEu(p0, '러') : attachC(p0, '고');
        tokens.push({ text: link, sources: [first.key], role: 'predicate' });
        for (const x of all) if (x.late) tokens.push(x.token);
      }
      tokens.push({ text: realizePredicate(mainPred, f), sources: [main.key, ...markerKeys], role: 'predicate' });

      const note = opts.vocative ? `${subject?.e.word}에게 말하기` : subject ? (opts.omitSubject ? `주어 생략(${subject.e.word})` : `주어: ${subject.e.word}`) : '주어 없음';
      return { text: textOf(tokens.filter((t) => t.text !== '')), tokens, features: f, score: a.score - rank * 0.3, note, unused };
    };

    const subjCat = subject?.e.cat;
    const isPronounSubj = !!subjCat && PRONOUNS.has(subjCat);
    const polite = features.speech !== 'plain';
    // 기본형: 나/우리는 '은/는', 너는 존댓말에서 생략
    // 약속·의지는 '제가 할게요'처럼 주격으로 나선다
    const topicDefault = isPronounSubj && !['question', 'volitionQ', 'promise', 'volition'].includes(features.mood);
    const base = build({
      vocative: false,
      omitSubject: subjCat === 'you' && polite,
      topicSubject: topicDefault,
    });
    candidates.push(base);
    // '내일 와'처럼 현재형으로 가까운 미래를 말하는 것도 자연스럽다
    if (tenseFromTime) candidates.push({ ...build({ vocative: false, omitSubject: subjCat === 'you' && polite, topicSubject: topicDefault, tense: 'present' }), score: base.score - 0.7 });
    if (subject && isPronounSubj && subjCat !== 'you') candidates.push({ ...build({ vocative: false, omitSubject: true, topicSubject: false }), score: base.score - 1.6 }); // 말맛 변이는 다른 해석보다 뒤로
    const animateSubj = subjCat === 'person' || subjCat === 'animal';
    if (subject && animateSubj && !subject.e.wh) {
      candidates.push({ ...build({ vocative: false, omitSubject: false, topicSubject: true }), score: base.score - 1.6 }); // 같은 뜻의 말맛 차이라 다른 해석보다 뒤로
      const imperativeLike = ['command', 'request', 'suggest'].includes(features.mood);
      const canVocative = subjCat === 'person' && main.e.pos === 'verb' && features.tense !== 'past' && (imperativeLike || features.mood === 'statement');
      if (canVocative) {
        const voc = build({ vocative: true, omitSubject: false, topicSubject: false });
        candidates.push({ ...voc, score: imperativeLike ? base.score + 1 : base.score - 0.3 });
      }
    }
  });

  const seen = new Set<string>();
  const best = Math.max(...candidates.map((c) => c.score));
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((c) => c.score >= best - 4) // 너무 처지는 해석은 보여 주지 않는다
    .filter((c) => (seen.has(c.text) ? false : (seen.add(c.text), true)))
    .map(withPhrases)
    .slice(0, limit);
}

/** 서술어 카드 없이 명사만: '물 주세요', '화장실이 어디예요?', '엄마, 물이요.' */
function nounOnly(nouns: NounCard[], markers: { key: string; e: MarkerEntry }[], adverbs: { key: string; e: AdverbEntry }[], f: Features): Candidate[] {
  const request = markers.find((m) => m.e.set.mood === 'request');
  const unusedMarkers = markers.filter((m) => m !== request).map((m) => m.key);
  const adverbTokens: Token[] = adverbs.map((a) => ({ text: a.e.word, sources: [a.key], role: 'adverb' }));
  const person = nouns.length > 1 ? nouns.find((n) => n.e.cat === 'person' && !n.e.wh) : undefined;
  const rest = nouns.filter((n) => n !== person);
  const vocative: Token[] = person ? [{ text: person.e.word, sources: [person.key], role: 'vocative' }] : [];
  const word = (n: NounCard) => (f.speech !== 'plain' && n.e.cat === 'self' ? '저' : n.e.word);

  if (request) {
    const tokens: Token[] = [...vocative, ...rest.map((n) => ({ text: word(n), sources: [n.key], role: 'theme' as const })), ...adverbTokens];
    const ask = f.speech === 'plain' ? '줘' : f.speech === 'formal' ? '주십시오' : '주세요';
    tokens.push({ text: ask, sources: [request.key], role: 'predicate' });
    return [{ text: textOf(tokens), tokens, features: f, score: 5, note: '달라고 하기', unused: unusedMarkers }];
  }

  const wh = rest.find((n) => n.e.wh);
  if (wh) {
    const others = rest.filter((n) => n !== wh);
    const tokens: Token[] = [...vocative, ...others.map((n) => ({ text: word(n) + josaFor(word(n), '이/가'), sources: [n.key], role: 'agent' as const })), ...adverbTokens];
    tokens.push({ text: realizeCopula(wh.e.word, { ...f, mood: 'question' }), sources: [wh.key], role: 'predicate' });
    return [{ text: textOf(tokens), tokens, features: { ...f, mood: 'question' }, score: 5, note: '묻기', unused: unusedMarkers }];
  }

  if (!rest.length) return [];
  const last = rest[rest.length - 1]!;
  const lastWord = word(last);
  const frag = f.speech === 'plain' ? lastWord : f.speech === 'formal' ? `${lastWord}입니다` : lastWord + (finalJong(lastWord) === '' ? '요' : '이요');
  const tokens: Token[] = [
    ...vocative,
    ...rest.slice(0, -1).map((n) => ({ text: word(n) + ',', sources: [n.key], role: 'fragment' as const })),
    ...adverbTokens,
    { text: frag, sources: [last.key], role: 'fragment' },
  ];
  return [{ text: textOf(tokens), tokens, features: f, score: 1, note: '낱말로 말하기', unused: unusedMarkers }];
}
