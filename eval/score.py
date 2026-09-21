"""엔진 후보와 원문을 형태소 단위로 비교해 복원율을 잰다.

  .venv/bin/python score.py data/tatoeba-preds.jsonl [--errors 40]

세 가지 기준:
  엄격     형태소(형태+품사)가 원문과 똑같다. 띄어쓰기·문장부호만 무시.
  대명사   나↔저, 우리↔저희 차이를 같게 본다(엔진은 존댓말에서 늘 '저'를 쓴다).
  조사생략 원문이 조사를 뺀 구어(나 머리 아파)면 조사 차이도 같게 본다.
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from kiwipiepy import Kiwi

KIWI = Kiwi()
SKIP_TAGS = {'SF', 'SP', 'SS', 'SE', 'SO', 'SW'}
PRONOUN = {'저': '나', '저희': '우리', '제': '나', '이것': '이거', '그것': '그거', '저것': '저거'}  # 이것/이거는 같은 말의 말투 차이
CASE_JOSA = {'JKS', 'JKO', 'JX'}
_cache: dict[str, list[tuple[str, str]]] = {}


def morphs(s: str) -> list[tuple[str, str]]:
    if s not in _cache:
        _cache[s] = [(t.form, t.tag.split('-')[0]) for t in KIWI.tokenize(s) if t.tag not in SKIP_TAGS]
    return _cache[s]


# 뜻이 같은 조사 변이(말맛 차이): 한테=에게, 랑=이랑=하고=와=과, 서=에서
SAME_JOSA = {'한테': '에게', '이랑': '와', '랑': '와', '하고': '와', '과': '와', '서': '에서'}


def key(s: str, level: str) -> tuple:
    m = morphs(s)
    if level == 'strict':
        return tuple(m)
    # 느슨한 기준은 형태만 비교(Kiwi 가 같은 낱말을 NNG/MAG 로 달리 붙이는 흔들림을 없앤다)
    forms = [PRONOUN.get(f, f) if t == 'NP' else (SAME_JOSA.get(f, f) if t.startswith('J') else f) for f, t in m]
    if level in ('josa', 'bag'):
        forms = [f for f, (_, t) in zip(forms, m) if t not in CASE_JOSA]
    if level == 'bag':
        # 어순 무시: 카드를 섞어 넣었을 때 역할(뜻 조사)·어미가 맞는지만 본다
        return tuple(sorted(forms))
    return tuple(forms)


def split_of(item_id: str) -> str:
    """항목 id 해시로 고정 분할: 개발용(오류 분석·튜닝) / 시험용(보고용, 들여다보지 않음)"""
    return 'dev' if int(hashlib.sha1(item_id.encode()).hexdigest(), 16) % 2 == 0 else 'test'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('preds')
    ap.add_argument('--errors', type=int, default=0)
    ap.add_argument('--split', choices=['dev', 'test', 'all'], default='dev')
    ap.add_argument('--bag', action='store_true', help='어순을 무시하는 기준도 잰다(카드 섞기 실험용)')
    ap.add_argument('--emit-gold', help='항목마다 원문과 맞는 후보 문장(조사생략 기준)을 적은 파일을 쓴다(개인화 흉내 실험용)')
    args = ap.parse_args()
    rows = [json.loads(l) for l in Path(args.preds).read_text().splitlines() if l.strip()]
    if args.split != 'all':
        rows = [r for r in rows if split_of(r['id']) == args.split]
    if args.split == 'test' and args.errors:
        raise SystemExit('시험용 오류는 보지 않는다(튜닝에 새면 숫자가 부풀려진다)')
    levels = [('strict', '엄격'), ('pronoun', '대명사'), ('josa', '조사생략')] + ([('bag', '어순무시')] if args.bag else [])
    hits = {lv: Counter() for lv, _ in levels}
    errors = []
    for r in rows:
        for lv, _ in levels:
            gold = key(r['text'], lv)
            ranks = [i for i, p in enumerate(r['preds']) if key(p, lv) == gold]
            rank = ranks[0] if ranks else None
            for k in (1, 3, 5):
                if rank is not None and rank < k:
                    hits[lv][k] += 1
            if lv == 'josa' and rank is None:
                errors.append(r)
    if args.emit_gold:
        out = []
        for r in rows:
            gold = key(r['text'], 'josa')
            match = next((p for p in r['preds'] if key(p, 'josa') == gold), None)
            out.append(json.dumps({**r, 'gold': match}, ensure_ascii=False))
        Path(args.emit_gold).write_text('\n'.join(out) + '\n')
    n = len(rows)
    print(f'[{args.split}] 항목 {n}개 (사람이 쓴 Tatoeba 문장을 카드열로 바꾼 것)')
    print(f'{"기준":<8}{"1순위":>8}{"3순위 안":>10}{"5순위 안":>10}')
    for lv, name in levels:
        h = hits[lv]
        print(f'{name:<8}{h[1] / n:>8.1%}{h[3] / n:>10.1%}{h[5] / n:>10.1%}')
    if args.errors:
        print(f'\n복원 실패(조사생략 기준) {len(errors)}건 중 {min(args.errors, len(errors))}건:')
        for r in errors[: args.errors]:
            print(f"  원문 {r['text']}\n     카드 {' '.join(r['cards'])} ({r['speech']})\n     후보 {' | '.join(r['preds'][:3])}")


if __name__ == '__main__':
    main()
