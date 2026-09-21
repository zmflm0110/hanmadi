"""그림 상징 확인용 한 장짜리 모음(개발용). scratch 에 PNG 로 쓴다."""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
LEX = json.loads((ROOT / 'eval/data/lexicon.json').read_text())
out, start, count = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
items = [e for e in LEX][start:start + count]
cols, cell = 10, 150
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * (cell + 26)), 'white')
font = ImageFont.truetype('/System/Library/Fonts/AppleSDGothicNeo.ttc', 18)
d = ImageDraw.Draw(sheet)
for i, e in enumerate(items):
    x, y = (i % cols) * cell, (i // cols) * (cell + 26)
    p = ROOT / f"public/pictograms/{e['id']}.png"
    if p.exists():
        im = Image.open(p).convert('RGBA').resize((cell - 10, cell - 10))
        sheet.paste(im, (x + 5, y + 5), im)
    d.text((x + 6, y + cell - 2), e.get('word') or e.get('lemma'), fill='black', font=font)
sheet.save(out)
print(out, len(items))
