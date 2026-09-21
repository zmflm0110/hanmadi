"""사전 낱말마다 ARASAAC 그림 상징을 찾아 내려받는다.

ARASAAC 그림: Sergio Palao, 출처 ARASAAC(https://arasaac.org), 라이선스 CC BY-NC-SA 4.0, 소유 아라곤 정부(스페인).
한국어 키워드로 먼저 찾고, 없으면 영어 키워드(ENGLISH 표)로 찾는다. 결과는 public/pictograms/<카드id>.png 와 매핑 파일.

  eval/.venv/bin/python scripts/fetch-pictograms.py
"""
import json
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LEX = json.loads((ROOT / 'eval/data/lexicon.json').read_text())
OUT = ROOT / 'public/pictograms'
MAP = ROOT / 'src/data/pictograms.json'

# 한국어 검색이 엉뚱하거나 비는 낱말은 영어로 찾는다
ENGLISH = {
    'na': 'I', 'neo': 'you', 'uri': 'we', 'mwo': 'what', 'nugu': 'who', 'eodi': 'where', 'eonje': 'when', 'wae': 'why',
    'an': 'not', 'mot': 'can not', 'q': 'question', 'juseyo': 'give me', 'gachi': 'together', 'sipda': 'want',
    'suitda': 'can', 'haeya': 'must', 'jungida': 'now', 'boda-try': 'try', 'jimaseyo': 'do not', 'haseyo': 'do',
    'past': 'past', 'future': 'future', 'promise': 'promise', 'volition': 'want', 'halkkayo': 'shall we',
    'ppalli': 'fast', 'cheoncheonhi': 'slow', 'mani': 'a lot', 'jogeum': 'a little', 'deo': 'more', 'tto': 'again',
    'neomu': 'very', 'jeongmal': 'really', 'honja': 'alone',
    'annyeong': 'hello', 'gomawo': 'thank you', 'mianhae': 'sorry', 'ne': 'yes', 'aniyo': 'no', 'saranghae': 'I love you',
    'dowajwo': 'help', 'jalja': 'good night', 'bul': 'light', 'tv': 'television', 'cha': 'car', 'bae': 'belly',
    'mok': 'neck', 'nun': 'eye', 'son': 'hand', 'gong': 'ball', 'bak': 'outside', 'jigeum': 'now', 'oneul': 'today',
    'eoje': 'yesterday', 'naeil': 'tomorrow', 'akka': 'before', 'ittaga': 'later', 'itda': 'there is', 'eopda': 'there is not',
    'bap': 'rice', 'ramyeon': 'noodles', 'gimbap': 'sushi', 'mannada': 'meet', 'moreuda': 'not know', 'gwaenchanta': 'okay',
    'jeongmal': 'true', 'misul': 'art', 'swi': 'pee', 'eungga': 'poo', 'gansik': 'snack', 'geupsik': 'lunch', 'jongi': 'paper',
    'gawi': 'scissors', 'keurepaseu': 'crayon', 'gijeogwi': 'diaper', 'saekchilhada': 'color', 'swihada': 'pee', 'eungahada': 'poo',
    'kkeunnada': 'finish', 'bakkuda': 'change', 'maryeopda': 'want to go to the toilet', 'geuman': 'stop', 'da': 'all', 'salda': 'live',
}


# 눈으로 검토해서 고른 그림(검색 1순위가 엉뚱했던 것): 공원이 스페인의 특정 공원, 미술이 리코더, '해야'가 콧수염 …
OVERRIDE = {
    'gongwon': 30609, 'bap': 39387, 'keurepaseu': 4951, 'misul': 16339, 'jumal': 32396, 'eodi': 7764, 'hada': 32751,
    'haseyo': 11749, 'kyeoda': 21818, 'kkeuda': 21365, 'moreuda': 7180, 'eopda': 29839, 'juseyo': 28431,
    'halkkayo': 11576, 'boda-try': 26144, 'jimaseyo': 32366, 'jogeum': 7209, 'suitda': 11750, 'haeya': 15523,
    'itda': 32761, 'gachi': 26818, 'volition': 36518,
}
# 알맞은 그림이 없는 기능어는 글자 카드로 둔다(AAC 에서 흔한 방식)
TEXT_ONLY = {'an', 'mot', 'jeongmal'}
BAD_IDS = {39109}  # 검색이 비면 돌려주는 '12월 31일' 그림


def get(url: str):
    req = urllib.request.Request(url, headers={'User-Agent': 'hanmadi-aac/0.1 (open-source AAC; contact via GitHub)'})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def search(lang: str, word: str):
    try:
        data = json.loads(get(f'https://api.arasaac.org/api/pictograms/{lang}/search/{urllib.parse.quote(word)}'))
    except Exception:
        return None
    # 같은 낱말로 딱 맞는 키워드를 가진 그림을 먼저
    data = [p for p in data if p['_id'] not in BAD_IDS]
    exact = [p for p in data if any(k['keyword'] == word for k in p.get('keywords', []))]
    pick = (exact or data or [None])[0]
    return pick['_id'] if pick else None


def main():
    mapping = json.loads(MAP.read_text()) if MAP.exists() else {}
    for cid in TEXT_ONLY:
        mapping.pop(cid, None)
        (OUT / f'{cid}.png').unlink(missing_ok=True)
    for e in LEX:
        cid = e['id']
        if cid in TEXT_ONLY:
            continue
        want = OVERRIDE.get(cid)
        if cid in mapping and (OUT / f'{cid}.png').exists() and (want is None or mapping[cid]['arasaac'] == want):
            continue
        if want is not None:
            png = get(f'https://static.arasaac.org/pictograms/{want}/{want}_300.png')
            (OUT / f'{cid}.png').write_bytes(png)
            mapping[cid] = {'arasaac': want, 'query': 'reviewed'}
            print(f'  {cid:14} → {want} (검토해서 고름)')
            time.sleep(0.15)
            continue
        word = e.get('word') or e.get('lemma')
        pid, how = None, ''
        if cid not in ENGLISH:
            pid, how = search('ko', word), 'ko'
        if pid is None:
            pid, how = search('en', ENGLISH.get(cid, word)), 'en'
        if pid is None:
            print(f'  없음: {cid} {word}')
            continue
        png = get(f'https://static.arasaac.org/pictograms/{pid}/{pid}_300.png')
        (OUT / f'{cid}.png').write_bytes(png)
        mapping[cid] = {'arasaac': pid, 'query': how}
        print(f'  {cid:14} {word:8} → {pid} ({how}, {len(png) // 1024}KB)')
        time.sleep(0.15)
    MAP.write_text(json.dumps(mapping, ensure_ascii=False, indent=1))
    print(f'{len(mapping)}/{len(LEX)}개 연결')


if __name__ == '__main__':
    main()
