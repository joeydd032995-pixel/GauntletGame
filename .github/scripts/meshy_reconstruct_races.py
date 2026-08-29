#!/usr/bin/env python3
import base64, io, json, os, pathlib, sys, time
from typing import Dict, List
import requests
from PIL import Image, ImageChops, ImageFilter

API='https://api.meshy.ai/openapi/v1'
KEY=os.environ.get('MESHY_API_KEY','').strip()
OUT=pathlib.Path('artifacts/meshy-races')
OUT.mkdir(parents=True, exist_ok=True)

RACES={
 'cairnborn':{
  'turnaround':'https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_8c5e983c-f451-4d13-9d1a-01ae08424ebd.png',
  'element':'579defc6-18d2-4dd7-83ff-6d23a51f31fe','height':1.82},
 'brinesworn':{
  'turnaround':'https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_47d68649-e037-4392-8a1e-6b71fa6440ab.png',
  'element':'d504b1e4-275d-4ccc-a07f-ab61bcc6848d','height':1.88},
 'myceliad':{
  'turnaround':'https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_c30853e3-0fbb-4136-9eb9-fddfc58a164e.png',
  'element':'d9b6f30a-fa51-47c4-b22c-70ed66c07081','height':1.78},
 'veylkin':{
  'turnaround':'https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_5c7ba582-8a5e-4a63-aa16-927ff878b35c.png',
  'element':'57e790db-f7c4-4a5b-a0b1-ed66a1915314','height':1.91},
 'echoed':{
  'turnaround':'https://d8j0ntlcm91z4.cloudfront.net/user_3IW29AsWwaKT2gBThWl4v30lXFQ/hf_20260829_000923_562e70ce-0f84-40f4-8807-ff9cd5f8cdb8.png',
  'element':'09146293-fa83-4aef-b6e1-a3e1ee7dd6db','height':1.82},
}

S=requests.Session()
S.headers.update({'Authorization':f'Bearer {KEY}','Content-Type':'application/json'})

def die(msg):
 print(msg,file=sys.stderr); sys.exit(2)

def get_image(url):
 r=requests.get(url,timeout=120); r.raise_for_status(); return Image.open(io.BytesIO(r.content)).convert('RGB')

def bg_color(im):
 pts=[im.getpixel((8,8)),im.getpixel((im.width-9,8)),im.getpixel((8,im.height-9)),im.getpixel((im.width-9,im.height-9))]
 return tuple(sum(p[i] for p in pts)//4 for i in range(3))

def extract_views(im:Image.Image, race:str)->List[Image.Image]:
 # Segment non-background subject islands from the neutral 4K turnaround.
 small=im.resize((1024,1024))
 bg=Image.new('RGB',small.size,bg_color(small))
 diff=ImageChops.difference(small,bg).convert('L').filter(ImageFilter.GaussianBlur(2))
 mask=diff.point(lambda p:255 if p>24 else 0)
 # Connected components on a 256px mask keeps this dependency-free and deterministic.
 m=mask.resize((256,256),Image.Resampling.NEAREST)
 px=m.load(); seen=set(); comps=[]
 for y in range(256):
  for x in range(256):
   if px[x,y]==0 or (x,y) in seen: continue
   stack=[(x,y)]; seen.add((x,y)); xs=[]; ys=[]
   while stack:
    a,b=stack.pop(); xs.append(a); ys.append(b)
    for na,nb in ((a+1,b),(a-1,b),(a,b+1),(a,b-1)):
     if 0<=na<256 and 0<=nb<256 and px[na,nb] and (na,nb) not in seen:
      seen.add((na,nb)); stack.append((na,nb))
   area=len(xs)
   if area>350:
    comps.append((area,min(xs),min(ys),max(xs)+1,max(ys)+1))
 comps=sorted(comps,reverse=True)[:8]
 # Prefer four tall/full-body components; fallback to equal vertical quarters if the board is laid horizontally.
 boxes=[]
 for area,x0,y0,x1,y1 in comps:
  w=x1-x0; h=y1-y0
  if h>40 and w>18 and h/w>1.15:
   boxes.append((x0,y0,x1,y1,area))
 boxes=sorted(boxes,key=lambda b:(b[1]//64,b[0]))[:4]
 if len(boxes)!=4:
  boxes=[(i*64,0,(i+1)*64,256,0) for i in range(4)]
 views=[]
 scale=im.width/256
 for i,(x0,y0,x1,y1,_) in enumerate(boxes):
  pad=8
  X0=max(0,int((x0-pad)*scale)); X1=min(im.width,int((x1+pad)*scale))
  Y0=max(0,int((y0-pad)*scale)); Y1=min(im.height,int((y1+pad)*scale))
  crop=im.crop((X0,Y0,X1,Y1))
  crop.thumbnail((1536,1536),Image.Resampling.LANCZOS)
  canvas=Image.new('RGB',(1536,1536),(230,230,230))
  ox=(1536-crop.width)//2; oy=(1536-crop.height)//2
  canvas.paste(crop,(ox,oy))
  canvas.save(OUT/f'{race}-view-{i}.png',optimize=True)
  views.append(canvas)
 return views

def data_uri(im):
 b=io.BytesIO(); im.save(b,format='PNG',optimize=True)
 return 'data:image/png;base64,'+base64.b64encode(b.getvalue()).decode()

def post(endpoint,payload):
 r=S.post(API+endpoint,json=payload,timeout=180)
 if r.status_code>=400: raise RuntimeError(f'POST {endpoint} {r.status_code}: {r.text[:1200]}')
 return r.json()['result']

def poll(endpoint,task_id,timeout=1200):
 end=time.time()+timeout
 while time.time()<end:
  r=S.get(f'{API}{endpoint}/{task_id}',timeout=60)
  if r.status_code>=400: raise RuntimeError(f'GET {endpoint} {r.status_code}: {r.text[:1200]}')
  j=r.json(); st=j.get('status')
  print(endpoint,task_id,st,j.get('progress'))
  if st=='SUCCEEDED': return j
  if st=='FAILED': raise RuntimeError(json.dumps(j.get('task_error') or j,indent=2)[:4000])
  time.sleep(15)
 raise TimeoutError(f'{endpoint}/{task_id} timed out')

def download(url,path):
 with requests.get(url,stream=True,timeout=180) as r:
  r.raise_for_status()
  with open(path,'wb') as f:
   for c in r.iter_content(1024*1024): f.write(c)

def main():
 if not KEY: die('MESHY_API_KEY is not configured in this execution environment.')
 # Verify credentials without exposing the key.
 bal=S.get(API+'/balance',timeout=30)
 if bal.status_code!=200: die(f'Meshy balance/auth check failed: {bal.status_code} {bal.text[:500]}')
 print('Meshy balance:',bal.text[:500])
 summary={}
 for race,cfg in RACES.items():
  print(f'=== {race} ===',flush=True)
  im=get_image(cfg['turnaround'])
  views=extract_views(im,race)
  uris=[data_uri(v) for v in views]
  payload={
   'image_urls':uris,
   'ai_model':'meshy-7',
   'should_texture':True,
   'enable_pbr':True,
   'texture_resolution':'4k',
   'texture_image_urls':uris,
   'should_remesh':True,
   'target_polycount':45000,
   'topology':'quad',
   'target_formats':['glb'],
   'auto_size':True,
   'origin_at':'bottom',
   'multi_view_thumbnails':True,
   'moderation':True
  }
  recon_id=post('/multi-image-to-3d',payload)
  recon=poll('/multi-image-to-3d',recon_id)
  (OUT/f'{race}-reconstruction.json').write_text(json.dumps(recon,indent=2))
  glb=(recon.get('model_urls') or {}).get('glb')
  if not glb: raise RuntimeError(f'{race}: reconstruction succeeded without GLB')
  download(glb,OUT/f'{race}-hero-unrigged.glb')
  rig_id=post('/rigging',{'input_task_id':recon_id,'height_meters':cfg['height']})
  rig=poll('/rigging',rig_id)
  (OUT/f'{race}-rigging.json').write_text(json.dumps(rig,indent=2))
  rig_urls=rig.get('rigged_character_glb_url') or (rig.get('model_urls') or {}).get('glb') or rig.get('rigged_model_url')
  if not rig_urls:
   # Preserve the complete response for diagnosis rather than pretending the rig is valid.
   raise RuntimeError(f'{race}: rigging succeeded but no recognized rigged GLB URL field: {json.dumps(rig)[:2000]}')
  download(rig_urls,OUT/f'{race}-hero.glb')
  summary[race]={'elementId':cfg['element'],'reconstructionTask':recon_id,'riggingTask':rig_id,'status':'generated-unaccepted','faceCount':recon.get('face_count'),'thumbnail':recon.get('thumbnail_url'),'thumbnailUrls':recon.get('thumbnail_urls')}
  (OUT/'summary.json').write_text(json.dumps(summary,indent=2))
 print(json.dumps(summary,indent=2))

if __name__=='__main__': main()
