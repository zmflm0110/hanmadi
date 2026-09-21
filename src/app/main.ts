import './style.css';
import { CORE } from '../data/core';
import type { Category, Entry } from '../engine/lexicon';
import { realize, type Candidate, type Card } from '../engine/realize';
import { TABS, colorOf, entriesFor, labelOf, pictureOf, type TabId } from './board';
import { Scanner } from './scan';
import { hasKoreanVoice, speak } from './speech';
import { TASKS, conditionFor } from './tasks';
import { store, summarize, toNoun, type LogEvent, type MyCard, type Settings } from './store';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let settings: Settings = store.settings();
let myCards: MyCard[] = store.myCards();
let sentence: Card[] = [];
let candidates: Candidate[] = [];
let tab: TabId = 'core';
let taps = 0;
let firstAt = 0;
let seq = 0;
// 과제 모드(사용성 평가): 과제마다 말투·문법 켬/끔이 정해진다
let task: { code: string; index: number } | null = null;

/** 지금 적용할 말투·문법 도움(과제 모드면 과제가 정한 값) */
function effective() {
  if (!task || task.index >= TASKS.length) return { grammar: settings.grammar, speech: settings.speech };
  return { grammar: conditionFor(task.code, task.index), speech: TASKS[task.index]!.speech };
}

const photos = () => Object.fromEntries(myCards.map((c) => [c.id, c.photo]));
const myEntries = (): Entry[] => myCards.map(toNoun);
const findEntry = (id: string): Entry | undefined => CORE.find((e) => e.id === id) ?? myEntries().find((e) => e.id === id);

function log(e: Omit<LogEvent, 't'>) {
  store.append({ t: Date.now(), ...e });
}

// ── 문장 만들기 ─────────────────────────────────────────────────────────
function compute() {
  if (!sentence.length) {
    candidates = [];
    return;
  }
  const eff = effective();
  if (!eff.grammar) {
    // 비교 모드: 기존 AAC 처럼 카드 이름을 차례로 읽는다
    const text = sentence.map((c) => labelOf(c.entry)).join(' ');
    candidates = [{ text, tokens: [], features: {} as Candidate['features'], score: 0, note: '카드 이름 그대로', unused: [] }];
    return;
  }
  candidates = realize(sentence, { speech: eff.speech, honorListener: settings.honorListener }, 4);
}

function addCard(e: Entry) {
  if (!sentence.length) {
    firstAt = Date.now();
    taps = 0;
  }
  taps += 1;
  sentence.push({ key: `${e.id}#${seq++}`, entry: e });
  log({ type: 'add', card: e.id.startsWith('mine-') ? 'mine' : e.id });
  if (settings.speakOnTap) speak(labelOf(e), settings.rate);
  update();
}

function removeAt(i: number) {
  sentence.splice(i, 1);
  taps += 1;
  log({ type: 'remove' });
  update();
}

function clearSentence(logIt = true) {
  sentence = [];
  if (logIt) log({ type: 'clear' });
  update();
}

function say(i: number) {
  const c = candidates[i];
  if (!c) return;
  speak(c.text, settings.rate);
  const eff = effective();
  log({ type: 'speak', rank: i, taps: taps + 1, cards: sentence.length, ms: Date.now() - firstAt, grammar: eff.grammar, speech: eff.speech });
  if (task) {
    const t = TASKS[task.index]!;
    log({ type: 'task', task: t.id, participant: task.code, grammar: eff.grammar, speech: eff.speech, text: c.text, match: t.expect.test(c.text), rank: i, taps: taps + 1, cards: sentence.length, ms: Date.now() - firstAt });
    window.setTimeout(nextTask, 1200);
  }
  flash(i);
  if (settings.clearAfterSpeak) window.setTimeout(() => clearSentence(false), 900);
}

function flash(i: number) {
  const el = document.querySelector<HTMLElement>(`[data-cand="${i}"]`);
  el?.classList.add('spoken');
  window.setTimeout(() => el?.classList.remove('spoken'), 900);
}

// ── 그리기 ──────────────────────────────────────────────────────────────
function cardFace(e: Entry, cls = 'card'): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = `${cls} c-${colorOf(e)}`;
  const pic = pictureOf(e, photos());
  if (pic) {
    const img = document.createElement('img');
    img.src = pic;
    img.alt = '';
    img.loading = 'lazy';
    img.draggable = false;
    b.append(img);
  } else {
    b.classList.add('text-only');
  }
  const span = document.createElement('span');
  span.textContent = labelOf(e);
  b.append(span);
  b.setAttribute('aria-label', labelOf(e));
  return b;
}

function renderStrip() {
  const strip = $('strip');
  strip.replaceChildren();
  if (!sentence.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = '아래 카드를 눌러 하고 싶은 말을 모아 보세요';
    strip.append(p);
    return;
  }
  sentence.forEach((c, i) => {
    const chip = cardFace(c.entry, 'chip');
    chip.title = '누르면 빼요';
    chip.setAttribute('aria-label', `${labelOf(c.entry)} 빼기`);
    chip.onclick = () => removeAt(i);
    strip.append(chip);
  });
  strip.scrollLeft = strip.scrollWidth;
}

function renderSpeak() {
  const box = $('speak');
  box.replaceChildren();
  if (!candidates.length) {
    if (sentence.length) {
      const p = document.createElement('p');
      p.className = 'hint';
      p.textContent = '카드를 하나 더 골라 주세요';
      box.append(p);
    }
    return;
  }
  candidates.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = i === 0 ? 'cand first' : 'cand';
    b.dataset.cand = String(i);
    b.innerHTML = `<span class="say">🔊</span><span class="text"></span><small></small>`;
    b.querySelector('.text')!.textContent = c.text;
    b.querySelector('small')!.textContent = c.note;
    b.setAttribute('aria-label', `말하기: ${c.text}`);
    b.onclick = () => say(i);
    box.append(b);
  });
  const unused = candidates[0]?.unused ?? [];
  if (unused.length) {
    const p = document.createElement('p');
    p.className = 'hint';
    const names = unused.map((k) => sentence.find((c) => c.key === k)).filter(Boolean).map((c) => labelOf(c!.entry));
    p.textContent = `‘${names.join(', ')}’ 카드는 움직임·느낌 카드와 함께 쓰면 문장에 들어가요`;
    box.append(p);
  }
}

function renderTabs() {
  const nav = $('tabs');
  nav.replaceChildren();
  for (const t of TABS) {
    if (t.id === 'mine' && !myCards.length) continue;
    const b = document.createElement('button');
    b.className = `tab c-${t.color}${t.id === tab ? ' on' : ''}`;
    b.textContent = t.label;
    b.setAttribute('aria-pressed', String(t.id === tab));
    b.onclick = () => {
      tab = t.id;
      renderTabs();
      renderGrid();
      scanner.refresh();
    };
    nav.append(b);
  }
}

function renderGrid() {
  const grid = $('grid');
  grid.replaceChildren();
  grid.classList.toggle('big', settings.big);
  for (const e of entriesFor(tab, myEntries())) {
    const b = cardFace(e);
    b.onclick = () => addCard(e);
    grid.append(b);
  }
}

// ── 과제 모드 ───────────────────────────────────────────────────────────
function renderTask() {
  const box = $('task');
  if (!task) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.replaceChildren();
  if (task.index >= TASKS.length) {
    box.textContent = '과제를 모두 마쳤어요. 고맙습니다! (설정 → 기록 내보내기)';
    return;
  }
  const t = TASKS[task.index]!;
  const head = document.createElement('b');
  head.textContent = `과제 ${task.index + 1}/${TASKS.length}`;
  const text = document.createElement('span');
  text.textContent = t.prompt;
  const skip = document.createElement('button');
  skip.textContent = '건너뛰기';
  skip.onclick = () => {
    log({ type: 'task', task: t.id, participant: task!.code, grammar: effective().grammar, skipped: true });
    nextTask();
  };
  box.append(head, text, skip);
}

function nextTask() {
  if (!task) return;
  task.index += 1;
  clearSentence(false);
  renderTask();
}

$('task-start').onclick = () => {
  const code = ($('task-code') as HTMLInputElement).value.trim() || 'P00';
  task = { code, index: 0 };
  $<HTMLDialogElement>('settings').close();
  clearSentence(false);
  renderTask();
};
$('task-stop').onclick = () => {
  task = null;
  $<HTMLDialogElement>('settings').close();
  renderTask();
  update();
};

function update() {
  compute();
  renderStrip();
  renderSpeak();
  scanner.refresh();
}

// ── 스캐닝 ──────────────────────────────────────────────────────────────
function scanGroups(): HTMLElement[][] {
  const cands = [...document.querySelectorAll<HTMLElement>('#speak .cand')];
  const tools = [...document.querySelectorAll<HTMLElement>('.strip-tools .tool')];
  const tabs = [...document.querySelectorAll<HTMLElement>('#tabs .tab')];
  const cards = [...document.querySelectorAll<HTMLElement>('#grid .card')];
  const rows = new Map<number, HTMLElement[]>();
  for (const c of cards) {
    const top = c.offsetTop;
    rows.set(top, [...(rows.get(top) ?? []), c]);
  }
  const taskButtons = [...document.querySelectorAll<HTMLElement>('#task button')];
  return [cands, ...[...rows.values()], tabs, tools, taskButtons];
}

const scanner = new Scanner(scanGroups, () => settings.scanMs);

document.addEventListener(
  'keydown',
  (ev) => {
    if (!settings.scan) return;
    if ((document.querySelector('dialog[open]') as HTMLDialogElement | null) && ev.key !== 'Escape') return;
    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      scanner.press();
    } else if (ev.key === 'Escape') {
      settings.scan = false;
      store.saveSettings(settings);
      scanner.stop();
    }
  },
  true,
);

// 화면 전체가 스위치: 스캔 중에는 누른 자리와 상관없이 '고르기'
document.addEventListener(
  'pointerdown',
  (ev) => {
    if (!settings.scan || document.querySelector('dialog[open]')) return;
    ev.preventDefault();
    ev.stopPropagation();
    scanner.press();
  },
  true,
);
document.addEventListener(
  'click',
  (ev) => {
    // 스캔 중 실제 클릭은 scanner 가 el.click() 으로 만든 것만 통과시킨다
    if (settings.scan && ev.isTrusted && !document.querySelector('dialog[open]')) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  },
  true,
);

// ── 설정 ────────────────────────────────────────────────────────────────
const settingsDialog = $<HTMLDialogElement>('settings');

function fillSettings() {
  const f = settingsDialog.querySelector('form')!;
  (f.querySelector(`input[name=speech][value=${settings.speech}]`) as HTMLInputElement).checked = true;
  for (const k of ['honorListener', 'grammar', 'speakOnTap', 'clearAfterSpeak', 'big', 'scan'] as const) {
    (f.elements.namedItem(k) as HTMLInputElement).checked = settings[k];
  }
  (f.elements.namedItem('rate') as HTMLInputElement).value = String(settings.rate);
  (f.elements.namedItem('scanSec') as HTMLInputElement).value = String(settings.scanMs / 1000);
  const s = summarize(store.log());
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  $('log-summary').textContent = s.grammarOn.sentences + s.grammarOff.sentences
    ? `문법 도움 켬: ${s.grammarOn.sentences}문장, 평균 ${s.grammarOn.avgTaps.toFixed(1)}번 눌러 ${s.grammarOn.avgSeconds.toFixed(1)}초, 1순위 ${pct(s.grammarOn.top1)} · 끔: ${s.grammarOff.sentences}문장, 평균 ${s.grammarOff.avgTaps.toFixed(1)}번 ${s.grammarOff.avgSeconds.toFixed(1)}초`
    : '아직 기록이 없어요.';
  $('voice-warning').hidden = hasKoreanVoice();
}

settingsDialog.querySelector('form')!.addEventListener('change', (ev) => {
  const f = ev.currentTarget as HTMLFormElement;
  const data = new FormData(f);
  settings = {
    ...settings,
    speech: data.get('speech') as Settings['speech'],
    honorListener: data.has('honorListener'),
    grammar: data.has('grammar'),
    speakOnTap: data.has('speakOnTap'),
    clearAfterSpeak: data.has('clearAfterSpeak'),
    big: data.has('big'),
    scan: data.has('scan'),
    rate: Number(data.get('rate')),
    scanMs: Math.max(500, Number(data.get('scanSec')) * 1000),
  };
  store.saveSettings(settings);
  renderGrid();
  update();
});

settingsDialog.addEventListener('close', () => {
  if (settings.scan) scanner.start();
  else scanner.stop();
});

$('open-settings').onclick = () => {
  scanner.stop();
  fillSettings();
  settingsDialog.showModal();
};
$('undo').onclick = () => sentence.length && removeAt(sentence.length - 1);
$('clear').onclick = () => sentence.length && clearSentence();

$('export-log').onclick = () => {
  const events = store.log();
  const t0 = events[0]?.t ?? 0;
  const payload = {
    app: 'hanmadi',
    exportedAt: new Date().toISOString(),
    note: '익명 사용 기록. 카드 id·누른 횟수·시간만 있고 이름·사진·목소리는 없다.',
    summary: summarize(events),
    events: events.map((e) => ({ ...e, t: e.t - t0 })),
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 1)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `hanmadi-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
$('clear-log').onclick = () => {
  store.clearLog();
  fillSettings();
};

// ── 내 카드(사진) ───────────────────────────────────────────────────────
const mycardDialog = $<HTMLDialogElement>('mycard');
let pendingPhoto = '';

$('open-mycard').onclick = () => {
  pendingPhoto = '';
  ($('mycard-preview') as HTMLImageElement).removeAttribute('src');
  ($('mycard-word') as HTMLInputElement).value = '';
  $('mycard-error').hidden = true;
  mycardDialog.showModal();
};

$('mycard-file').addEventListener('change', async (ev) => {
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  pendingPhoto = await shrink(file, 256);
  ($('mycard-preview') as HTMLImageElement).src = pendingPhoto;
});

mycardDialog.addEventListener('close', () => {
  if (mycardDialog.returnValue !== 'save') return;
  const word = ($('mycard-word') as HTMLInputElement).value.trim();
  if (!word || !pendingPhoto) return;
  const card: MyCard = { id: `mine-${Date.now().toString(36)}`, word, cat: ($('mycard-cat') as HTMLSelectElement).value as Category, photo: pendingPhoto };
  const next = [...myCards, card];
  if (!store.saveMyCards(next)) {
    $('mycard-error').textContent = '저장 공간이 모자라 카드를 저장하지 못했어요. 쓰지 않는 내 카드를 지워 주세요.';
    $('mycard-error').hidden = false;
    mycardDialog.showModal();
    return;
  }
  myCards = next;
  tab = 'mine';
  renderTabs();
  renderGrid();
});

function shrink(file: File, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      const s = Math.min(img.width, img.height);
      c.width = c.height = size;
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ── 시작 ────────────────────────────────────────────────────────────────
renderTabs();
renderGrid();
update();
if (settings.scan) scanner.start();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
}

// 개발·시연용: 콘솔에서 findEntry('meokda') 로 카드 확인
Object.assign(window, { hanmadi: { findEntry, realize } });
