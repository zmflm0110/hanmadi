"""사람이 쓴 문장 → 카드열 평가 항목.

문장을 Kiwi 로 형태소 분석해 내용어는 카드로, 시제·부정·의문·양태는 기능 카드로 바꾼다.
조사·어미는 버린다(엔진이 복원해야 할 부분). 카드로 옮길 수 없는 형태소가 하나라도 있으면 그 문장은 뺀다.

  .venv/bin/python build_items.py data/raw/kor_sentences.tsv data/tatoeba-items.jsonl
"""
import json
import sys
from collections import Counter
from pathlib import Path

from kiwipiepy import Kiwi

HERE = Path(__file__).parent
LEX = json.loads((HERE / 'data/lexicon.json').read_text())

NOUNS = {}
for e in LEX:
    if e['kind'] == 'noun':
        NOUNS[e['word']] = e['id']
        if e.get('honorForm'):
            NOUNS[e['honorForm']] = e['id']
# 내/제/네 는 '내가·제가·네가' 일 때만 주어이고, 홀로 쓰이면 소유격(내 집)이라 카드가 없다
NOUNS.update({'저': 'na', '저희': 'uri', '무엇': 'mwo', '누': 'nugu', '이것': 'igeo', '그것': 'geugeo', '저것': 'jeogeo'})
PARTICLES = {'도': 'do', '만': 'man'}
NATIVE = {'한': 'hana', '하나': 'hana', '두': 'dul', '둘': 'dul', '세': 'set', '셋': 'set', '네': 'net', '넷': 'net', '다섯': 'daseot'}
COUNTERS = {'개', '명', '마리', '잔'}
DETS = {'이': 'i-det', '저': 'jeo-det'}
GA_ONLY = {'내': 'na', '제': 'na', '네': 'neo'}

PREDS = {e['lemma'][:-1]: e['id'] for e in LEX if e['kind'] == 'pred'}
# 높임·낮춤 낱말은 원래 카드로(드시다는 먹다/마시다가 애매해 뺀다)
PREDS.update({'계시': 'itda', '주무시': 'jada', '드리': 'juda'})
ADVERBS = {e['word']: e['id'] for e in LEX if e['kind'] == 'adverb'}
CAT = {e['id']: e.get('cat') for e in LEX if e['kind'] == 'noun'}
HONOR = {e['id']: e.get('honorific', False) for e in LEX if e['kind'] == 'noun'}
TIME_TENSE = {e['id']: e.get('tense') for e in LEX if e['kind'] == 'noun' and e.get('cat') == 'time'}

NOUN_TAGS = {'NNG', 'NNP', 'NP'}
PRED_TAGS = {'VV', 'VA', 'VV-I', 'VA-I', 'VV-R', 'VA-R'}
JOSA_TAGS = {'JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JKV', 'JKQ', 'JX', 'JC'}
PUNCT_TAGS = {'SF', 'SP', 'SS', 'SE', 'SO', 'SW'}


class Skip(Exception):
    def __init__(self, msg, missing=None):
        super().__init__(msg)
        self.missing = missing or []


# Kiwi 는 어미의 ㄴ·ㄹ·ㅂ·ㅆ 을 종성 자모(U+11A8~)로 준다: 'ᆯ게요', 'ᆫ다'. 호환 자모로 맞춘다.
_JONG = 'ᆨᆩᆪᆫᆬᆭᆮᆯᆰᆱᆲᆳᆴᆵᆶᆷᆸᆹᆺᆻᆼᆽᆾᆿᇀᇁᇂ'
_COMPAT = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
_JAMO = str.maketrans(_JONG, _COMPAT)


class Tok:
    def __init__(self, t):
        self.form = t.form.translate(_JAMO)
        self.tag = t.tag


# 말하는 AAC 가 내지 않는 글말체(해라체)와 아직 카드가 없는 종결 표현
HAERACHE = {'다', 'ㄴ다', '는다', '라', '어라', '아라', '냐', '느냐', '니', '으냐', '는가'}
UNSUPPORTED_EF = {'니까', '으니까', '니까요', '으니까요', '야지', '어야지', '아야지', '야지요', '구만', '구나', '군',  'ㄴ대요', '는대요', 'ㄴ대', '는대', '대요', '래요', '라고요', '거야', '을걸', 'ㄹ걸', '나요', 'ㄴ가요', '는가요', '은가요', '죠', '지요', '지', '잖아', '잖아요', '네요', '네', '군요', '구나', '는데', '는데요', 'ㄴ데', '은데', '거든', '거든요', '다고', 'ㄴ다고', '더라'}
# 뜻을 싣는 조사: 카드 없이 버리면 뜻이 사라진다
MEANING_JOSA = {'까지', '부터', '조차', '마저', '밖에', '마다', '보다', '처럼', '한테서', '에게서', '로서', '로써', '으로서', '으로써', '의', '나', '이나', '든지', '라도', '이라도'}


def speech_of(tokens) -> str:
    efs = [t.form for t in tokens if t.tag == 'EF']
    if not efs:
        raise Skip('종결어미 없음')
    ef = efs[-1]
    if ef in HAERACHE:
        raise Skip('해라체')
    if ef in UNSUPPORTED_EF:
        raise Skip('종결어미 종류')
    if ef.endswith('요'):
        return 'polite'
    if ef in ('ㅂ니다', '습니다', 'ㅂ니까', '습니까', '읍시다', 'ㅂ시다') or ef.endswith('시오'):
        return 'formal'
    return 'plain'


def to_cards(sentence: str, kiwi: Kiwi):
    toks = [Tok(t) for t in kiwi.tokenize(sentence)]
    if sum(1 for t in toks[:-1] if t.tag == 'SF') > 0:
        raise Skip('여러 문장')
    for t in toks:
        if t.tag.startswith('J') and (t.form in MEANING_JOSA or t.tag == 'JKG'):
            raise Skip('뜻 조사')
    speech = speech_of(toks)
    cards: list[str] = []
    markers: list[str] = []
    past = future = honor_seen = copula = False
    missing: list[str] = []  # 사전에 없는 낱말(끝까지 모은다: '하나만 없는 문장' 분석용)
    i = 0
    while i < len(toks):
        t = toks[i]
        nxt = toks[i + 1] if i + 1 < len(toks) else None
        tag = t.tag
        if tag == 'JX' and t.form in PARTICLES:
            cards.append(PARTICLES[t.form])
        elif tag in JOSA_TAGS or tag in PUNCT_TAGS or tag == 'EF':
            pass
        elif tag in ('MM', 'NR', 'SN') and t.form in NATIVE and nxt is not None and nxt.form in COUNTERS:
            cards.append(NATIVE[t.form])
            i += 2  # 셀 단위(개·명·마리·잔)는 엔진이 명사 범주로 다시 붙인다
            continue
        elif tag == 'MM' and t.form in DETS:
            cards.append(DETS[t.form])
        elif tag in NOUN_TAGS:
            # 명사 + 하다 동사(공부하다)
            if nxt is not None and nxt.tag == 'XSV' and nxt.form == '하':
                lemma = t.form + '하'
                if lemma in PREDS:
                    cards.append(PREDS[lemma])
                    i += 2
                    continue
                if t.form in NOUNS and CAT.get(NOUNS[t.form]) == 'activity':  # 사과하다 ≠ 사과(과일)+하다
                    cards += [NOUNS[t.form], 'hada']
                    i += 2
                    continue
                missing.append(f'{t.form}하다')
                i += 2
                continue
            if t.form in GA_ONLY and nxt is not None and nxt.tag == 'JKS':
                cards.append(GA_ONLY[t.form])
            elif t.form == '나' and nxt is not None and nxt.tag == 'JKG':
                cards.append('nae')  # 내(나의) 가방
                i += 2
                continue
            elif t.form not in NOUNS:
                missing.append(t.form)
            else:
                cards.append(NOUNS[t.form])
        elif tag.split('-')[0] in ('VV', 'VA'):
            form = t.form
            if form not in PREDS:
                missing.append(f'{form}다')
            else:
                cards.append(PREDS[form])
        elif tag == 'VX':
            prev = toks[i - 1] if i else None
            if t.form == '싶' and prev is not None and prev.form == '고':
                markers.append('sipda')
            elif t.form == '있' and prev is not None and prev.form == '고':
                markers.append('jungida')
            elif t.form in ('주', '드리') and prev is not None and prev.tag == 'EC' and prev.form in ('어', '아'):
                last_ef = [x.form for x in toks if x.tag == 'EF'][-1]
                if last_ef not in ('세요', '으세요', '어', '아', '어요', '아요', '십시오', 'ㅂ시오') or sentence.rstrip().endswith('?'):
                    raise Skip('해 주다(부탁 아님)')
                markers.append('juseyo')
            elif t.form == '보' and prev is not None and prev.tag == 'EC' and prev.form in ('어', '아'):
                markers.append('boda-try')
            else:
                raise Skip(f'보조용언: {t.form}')
        elif tag == 'EC':
            # 앞 형태소와 짝지어 처리하는 연결어미만 허용: -고 싶다 / -고 있다 / -어 주다 / -(으)러 가다 / -고 (두 동사)
            if t.form not in ('고', '어', '아', '러', '으러'):
                raise Skip(f'연결어미: {t.form}')
        elif tag == 'EP':
            if t.form in ('었', '았', 'ㅆ', '였'):
                past = True
            elif t.form in ('시', '으시', '세'):
                honor_seen = True  # 높임은 엔진이 주어를 보고 정한다. 높일 주어가 없으면 듣는 이 높임
            else:
                raise Skip(f'선어말어미: {t.form}')
        elif tag == 'MAG':
            if t.form == '안':
                markers.append('an')
            elif t.form == '못':
                markers.append('mot')
            elif t.form in ADVERBS:
                cards.append(ADVERBS[t.form])
            elif t.form in NOUNS and TIME_TENSE.get(NOUNS[t.form]) is not None or t.form in ('지금', '오늘', '어제', '내일', '아까', '이따가'):
                cards.append(NOUNS[t.form])
            else:
                missing.append(t.form)
        elif tag == 'VCP' and nxt is not None and nxt.tag in ('EF', 'EP'):
            copula = True  # 명사 + 이다로 맺는 문장: 엔진이 마지막 명사로 맺는다
        elif tag == 'VCN':
            markers.append('an')  # 아니다
            copula = True
        elif tag == 'ETM' and t.form in ('ㄹ', '을') and nxt is not None and nxt.form == '거':
            future = True
            i += 1  # '거' 건너뜀, 뒤의 이/VCP 도 건너뛴다
            while i + 1 < len(toks) and toks[i + 1].tag in ('VCP', 'JKS'):
                i += 1
        else:
            raise Skip(f'{tag}:{t.form}')
        i += 1

    if missing:
        raise Skip('사전에 없는 낱말', missing)
    if not copula and not any(c for c in cards if next((e for e in LEX if e['id'] == c), {}).get('kind') == 'pred'):
        raise Skip('서술어 카드 없음')
    if copula and any(next((e for e in LEX if e['id'] == c), {}).get('kind') == 'pred' for c in cards):
        raise Skip('이다 + 다른 서술어')  # 관형형 등이 섞인 문장
    time_tense = {TIME_TENSE.get(c) for c in cards}
    if past and 'past' not in time_tense:
        markers.append('past')
    if future and 'future' not in time_tense:
        markers.append('future')
    has_wh = any(c in ('mwo', 'nugu', 'eodi', 'eonje') for c in cards) or 'wae' in cards
    if sentence.rstrip().endswith('?') and not has_wh:
        markers.append('q')
    ef = [t.form for t in toks if t.tag == 'EF'][-1]
    ask = sentence.rstrip().endswith('?')
    if ef in ('ㄹ까요', '을까요', 'ㄹ까', '을까') and 'gachi' not in cards:
        markers.append('halkkayo')  # 묻는 제안·짐작: 먹을까? 좋을까?
    if ef in ('자', 'ㅂ시다', '읍시다') and 'gachi' not in cards:
        markers.append('haja')  # 같이 하자: 가자, 갑시다
    if ef in ('ㄹ게', '을게', 'ㄹ게요', '을게요', 'ㄹ께', 'ㄹ께요'):
        markers.append('promise')
    if ef in ('ㄹ래', '을래', 'ㄹ래요', '을래요'):
        markers.append('volition')
    if ef in ('세요', '으세요') and ask:
        honor_seen = True  # 좋아하세요? — 높임이 종결어미 안에 들어 있다
    if ef in ('세요', '으세요', '십시오', '으십시오', 'ㅂ시오') and not ask and 'juseyo' not in markers:
        markers.append('haseyo')  # 명령·권유로 본다(높임 평서문과 겹치면 엔진 후보 순위에서 갈린다)
    honor_nouns = any(HONOR.get(c) for c in cards)
    honor_listener = honor_seen and not honor_nouns
    return speech, cards + markers, honor_listener


def main(src: str, dst: str, gaps: int = 0):
    kiwi = Kiwi()
    reasons = Counter()
    one_miss = Counter()  # 이 낱말 하나만 있으면 표현할 수 있는 문장 수
    items = []
    total = 0
    for line in Path(src).read_text().splitlines():
        parts = line.split('\t')
        if len(parts) < 3:
            continue
        sid, _, text = parts[0], parts[1], parts[2].strip()
        total += 1
        try:
            speech, cards, honor_listener = to_cards(text, kiwi)
        except Skip as e:
            reasons[str(e).split(':')[0]] += 1
            if len(set(e.missing)) == 1:
                one_miss[e.missing[0]] += 1
            continue
        items.append({'id': sid, 'text': text, 'speech': speech, 'honorListener': honor_listener, 'cards': cards})
    Path(dst).write_text('\n'.join(json.dumps(x, ensure_ascii=False) for x in items) + '\n')
    print(f'전체 {total}문장 중 카드로 옮길 수 있는 문장 {len(items)} ({len(items) / total:.1%})')
    print('빠진 이유 상위:', reasons.most_common(12))
    if gaps:
        total_one = sum(one_miss.values())
        print(f'낱말 하나만 없어서 빠진 문장 {total_one}개. 그 낱말 상위 {gaps}:')
        print('  ' + ', '.join(f'{w}({n})' for w, n in one_miss.most_common(gaps)))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 0)
