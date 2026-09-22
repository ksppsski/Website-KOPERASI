"""Keep the original two-page DOCX rendering; clear only variable text areas."""
from pathlib import Path
import fitz,json,re,hashlib
ROOT=Path(__file__).resolve().parent.parent
source=ROOT/'templates/contract-source.pdf'
pdf=fitz.open(source)
# Coordinates come from the source rendering, in PDF points measured from top left.
slots=[]
def add(page,key,box,text,size=7,bold=False,center=False):
 slots.append(dict(page=page,key=key,box=box,text=text,size=size,bold=bold,center=center))
add(0,'number',[36.1,117.3,281.99,126.4],'Nomor : <<nospk>>/<<kodesurat>>',7,False,True)
add(0,'intro',[36.1,135,281.99,170.3],next(b['text'] for b in json.loads((ROOT/'templates/contract.json').read_text())['blocks'] if b['sourceIndex']==6))
# Preserve labels and colons. Only their placeholder values are removed.
for pi,page in enumerate(pdf):
 for b in page.get_text('dict')['blocks']:
  if b['type']!=0:continue
  for line in b['lines']:
   s=''.join(sp['text'] for sp in line['spans'])
   if s.strip().startswith(': <<'):
    key=re.search(r'<<([^>]+)>>',s).group(1)
    # The declaration/period/amount are handled by their whole paragraph slots.
    token=page.search_for('<<'+key+'>>')
    rect=next((r for r in token if abs(r.y0-line['bbox'][1])<1 and r.x0>=line['bbox'][0]),None)
    if rect:
     right=281.99 if rect.x0<300 else 561.39
     add(pi,key,[rect.x0,line['bbox'][1]+.2,right,line['bbox'][3]-.2],'<<'+key+'>>')
blocks=json.loads((ROOT/'templates/contract.json').read_text())['blocks']
add(0,'amount',[336.7,178.2,561.39,213.45],next(b['text'] for b in blocks if b['sourceIndex']==46))
add(0,'period',[315.4,376.2,561.39,402.8],next(b['text'] for b in blocks if b['sourceIndex']==56))
add(1,'member-sign-name',[315.4,275,561.39,284],'(<<nama>>)')
# Apply redactions to text only; artwork/lines outside fields stay byte-for-byte embedded.
for slot in slots: pdf[slot['page']].add_redact_annot(fitz.Rect(slot['box']),fill=(1,1,1))
for page in pdf:page.apply_redactions(images=0,graphics=0)
remaining=''.join(p.get_text() for p in pdf)
assert '<<' not in remaining,remaining[remaining.find('<<')-50:remaining.find('<<')+100]
out=ROOT/'templates/contract-original-layout.pdf';pdf.save(out,garbage=4,deflate=True)
meta={'version':'ski-original-layout-2026-09-21','sourcePdfSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'pageCount':2,'slots':slots,'signature':{'page':1,'box':[317.3,222,417.3,257]}}
(ROOT/'templates/contract-layout.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
print('Prepared original two-column template with',len(slots),'field areas')
