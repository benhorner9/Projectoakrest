"""Read-only public release fingerprint; compare before and after dev upload."""
import concurrent.futures,hashlib,json,sys,urllib.request,urllib.error
from pathlib import Path
paths=['index.html','characters.html','build-meta.json','asset-version.json']+[str(p) for d in ['src','vendor'] for p in Path(d).glob('*') if p.is_file()]
def fetch(p):
 try:
  with urllib.request.urlopen('https://playcellbound.com/oakrest/'+p,timeout=30) as r:
   return p,{'status':r.status,'sha256':hashlib.sha256(r.read()).hexdigest()}
 except urllib.error.HTTPError as e:
  if e.code==404:return p,{'status':404}
  raise
result=dict(concurrent.futures.ThreadPoolExecutor(max_workers=5).map(fetch,paths))
target=Path(sys.argv[1])
if len(sys.argv)>2 and sys.argv[2]=='--compare':
 before=json.loads(target.read_text())
 changed=[p for p in paths if before.get(p)!=result[p]]
 if changed:raise SystemExit('Public release changed: '+', '.join(changed))
 print('Public release unchanged: '+str(sum(x['status']==200 for x in result.values()))+' file hashes match; missing paths unchanged.')
else:
 target.write_text(json.dumps(result,indent=2));print('Recorded public release fingerprint.')
