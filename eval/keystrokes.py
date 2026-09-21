"""같은 문장을 만드는 데 몇 번 눌러야 하나.

  .venv/bin/python keystrokes.py data/tatoeba-preds.jsonl --split test

비교하는 방법:
  한마디       카드 수 + 후보 누르기 1번 (원문이 5순위 안에 있을 때)
  형태소 카드  조사·어미까지 카드로 따로 누르는 AAC 판(낱말 + 조사 + 어미 카드) + 말하기 1번
  두벌식 자판  글자를 자모 단위로 치기(쌍자음은 Shift 까지 2번, ㅘ 같은 겹모음·겹받침은 2타) + 띄어쓰기
  카드 이름만  카드 수 + 말하기 1번. 다만 문법 문장을 만들지 못한다(할머니 밥 먹다)
"""
import argparse
import json
from pathlib import Path

from kiwipiepy import Kiwi

from score import key, split_of

KIWI = Kiwi()
SKIP = {'SF', 'SP', 'SS', 'SE', 'SO', 'SW'}
# 두벌식에서 두 번 치는 자모
TWO_KEY_VOWELS = set('ㅘㅙㅚㅝㅞㅟㅢ')
SHIFT_JAMO = set('ㄲㄸㅃㅆㅉㅒㅖ')
TWO_KEY_JONG = set('ㄳㄵㄶㄺㄻㄼㄽㄾㄿㅀㅄ')
CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ'
JUNG = 'ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ'
JONG = ['', *'ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ']


def jamo_keys(ch: str) -> int:
    if ch == ' ':
        return 1
    o = ord(ch) - 0xAC00
    if not 0 <= o < 11172:
        return 1  # 문장부호 등
    cho, jung, jong = CHO[o // 588], JUNG[(o % 588) // 28], JONG[o % 28]
    n = 0
    for j in (cho, jung, jong):
        if not j:
            continue
        n += 1
        if j in TWO_KEY_VOWELS or j in TWO_KEY_JONG or j in SHIFT_JAMO:
            n += 1
    return n


def morpheme_cards(s: str) -> int:
    return sum(1 for t in KIWI.tokenize(s) if t.tag not in SKIP)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preds')
    ap.add_argument('--split', choices=['dev', 'test', 'all'], default='test')
    args = ap.parse_args()
    rows = [json.loads(l) for l in Path(args.preds).read_text().splitlines() if l.strip()]
    if args.split != 'all':
        rows = [r for r in rows if split_of(r['id']) == args.split]
    ok = []
    for r in rows:
        gold = key(r['text'], 'josa')
        ranks = [i for i, p in enumerate(r['preds']) if key(p, 'josa') == gold]
        if ranks:
            ok.append(r)
    n = len(ok)
    ours = sum(len(r['cards']) + 1 for r in ok) / n
    morph = sum(morpheme_cards(r['text']) + 1 for r in ok) / n
    typing = sum(sum(jamo_keys(c) for c in r['text']) for r in ok) / n
    label = sum(len(r['cards']) + 1 for r in ok) / n
    print(f'[{args.split}] 원문을 5순위 안에 복원한 {n}/{len(rows)}문장의 평균 누름 수')
    print(f'  한마디(카드 + 후보 1번)        {ours:5.2f}')
    print(f'  형태소 카드(조사·어미 따로)     {morph:5.2f}   → 한마디가 {1 - ours / morph:.0%} 덜 누름')
    print(f'  두벌식 자판(자모 단위)          {typing:5.2f}   → 한마디가 {1 - ours / typing:.0%} 덜 누름')
    print(f'  카드 이름만 읽기                {label:5.2f}   (같은 횟수지만 문법 문장은 0%)')


if __name__ == '__main__':
    main()
