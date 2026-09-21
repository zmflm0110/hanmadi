"""격틀 검사: 말뭉치에서 동사마다 실제로 어떤 조사가 붙은 명사와 쓰이는지 세고, 손으로 쓴 격틀과 대조한다.

  .venv/bin/python frame_check.py data/raw/kor_sentences.tsv data/raw/chatbot_sentences.tsv

같은 절(앞 서술어·연결어미 뒤부터 이 서술어까지) 안의 '명사+조사'를 센다.
격틀에 없는 조사가 3번 이상, 그 동사 조사의 15% 이상이면 빠진 자리 후보로 알린다.
은/는(주제)은 역할을 알 수 없어 세지 않는다.
"""
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

from kiwipiepy import Kiwi

HERE = Path(__file__).parent
LEX = json.loads((HERE / 'data/lexicon.json').read_text())
PREDS = {e['lemma'][:-1]: e for e in LEX if e['kind'] == 'pred'}
_JONG = 'ᆨᆩᆪᆫᆬᆭᆮᆯᆰᆱᆲᆳᆴᆵᆶᆷᆸᆹᆺᆻᆼᆽᆾᆿᇀᇁᇂ'
_COMPAT = 'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ'
_JAMO = str.maketrans(_JONG, _COMPAT)

# 말뭉치 조사 → 격틀 조사 표기
NORM = {
    '이': '이/가', '가': '이/가', '께서': '이/가',
    '을': '을/를', '를': '을/를', 'ㄹ': '을/를',
    '에': '에', '에서': '에서', '서': '에서',
    '에게': '에게', '한테': '에게', '께': '에게',
    '랑': '이랑/랑', '이랑': '이랑/랑', '와': '이랑/랑', '과': '이랑/랑', '하고': '이랑/랑',
    '로': '으로/로', '으로': '으로/로',
}
BOUNDARY = {'EC', 'EF', 'SF'}


def main(paths):
    kiwi = Kiwi()
    seen: dict[str, Counter] = defaultdict(Counter)
    for path in paths:
        for line in Path(path).read_text().splitlines():
            parts = line.split('\t')
            if len(parts) < 3:
                continue
            clause: list[str] = []
            toks = kiwi.tokenize(parts[2])
            for i, t in enumerate(toks):
                form, tag = t.form.translate(_JAMO), t.tag
                prev = toks[i - 1] if i else None
                if tag.startswith('J') and prev is not None and prev.tag in ('NNG', 'NNP', 'NP') and form in NORM:
                    clause.append(NORM[form])
                elif tag.split('-')[0] in ('VV', 'VA'):
                    lemma = form
                    if prev is not None and prev.tag == 'XSV':
                        pass
                    if lemma in PREDS:
                        for j in clause:
                            seen[PREDS[lemma]['id']][j] += 1
                    clause = []
                elif tag == 'XSV' and prev is not None and prev.tag == 'NNG':
                    lemma = prev.form + '하'
                    if lemma in PREDS:
                        for j in clause:
                            seen[PREDS[lemma]['id']][j] += 1
                    clause = []
                elif tag in BOUNDARY:
                    clause = []
    flagged = []
    for e in LEX:
        if e['kind'] != 'pred' or e['id'] not in seen:
            continue
        have = {s['josa'] for s in e['frame']}
        # 격틀의 '에서'는 장소, '에'는 목적지·자리: 둘 다 있으면 서로 대신하지 않는다
        total = sum(seen[e['id']].values())
        for josa, n in seen[e['id']].most_common():
            if josa not in have and n >= 3 and n / total >= 0.15:
                flagged.append((e['lemma'], josa, n, total))
    print(f'말뭉치에서 조사와 함께 쓰인 사전 동사 {len(seen)}개')
    print('격틀에 없는데 자주 나오는 조사(동사, 조사, 횟수/그 동사 조사 전체):')
    for lemma, josa, n, total in sorted(flagged, key=lambda x: -x[2]):
        print(f'  {lemma:8} + {josa:6} {n:4}/{total}')


if __name__ == '__main__':
    main(sys.argv[1:])
