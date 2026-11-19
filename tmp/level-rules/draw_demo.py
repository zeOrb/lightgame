import json
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
r=json.loads(Path('output/level-rules/autocorrect-result.json').read_text(encoding='utf-8'))
W,H=1500,1120
im=Image.new('RGB',(W,H),'#f4f6f3');d=ImageDraw.Draw(im)
font=lambda s,b=False:ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf' if b else 'C:/Windows/Fonts/arial.ttf',s)
ink='#22352e';muted='#63736c';blue='#c9dcfa';blueink='#204d86';amber='#f8d7a0';amberink='#815016';red='#c74a4b';green='#2c805a'
def txt(x,y,t,size=24,color=ink,b=False):d.text((x,y),t,font=font(size,b),fill=color)
def center(x,y,t,size=24,color=ink,b=False):
 f=font(size,b);box=d.textbbox((0,0),t,font=f);d.text((x-(box[2]-box[0])/2,y),t,font=f,fill=color)
def pill(x,y,text,color,bg):
 f=font(21,True);width=d.textlength(text,font=f)+32;d.rounded_rectangle((x,y,x+width,y+42),radius=12,fill=bg);txt(x+16,y+8,text,21,color,True);return width

txt(52,34,'Sunny / Ручной тест автокоррекции',35,b=True)
txt(52,86,'14 секций · нумерация с 0 · все позиции заданы вручную',23,muted)
pill(52,130,'Витраж ↔ витраж: расстояние ≥ 2',blueink,'#dfebfb')
pill(610,130,'Витраж ↔ сундук: расстояние ≥ 2',amberink,'#fae9cd')

warnings=r['result']['placementWarnings'];moved={(w['category'],w['index']) for w in warnings}
x0,gap,tile=57,9,90

def panel(y,title,subtitle,is_after):
 d.rounded_rectangle((34,y,W-34,y+326),radius=20,fill='white',outline='#d7e0d9',width=2)
 txt(58,y+22,title,29,b=True)
 txt(58,y+65,subtitle,22,muted)
 if is_after:
  objects={k:r['result']['placements'][k] for k in ['windows','chests']}
 else:
  objects={k:[{'offset':v} for v in r['input'][k]['items']] for k in ['windows','chests']}
 for i in range(14):
  x=x0+i*(tile+gap);by=y+135
  center(x+tile/2,y+104,str(i),21,muted,True)
  entry=next(((k,j) for k,items in objects.items() for j,v in enumerate(items) if v['offset']==i),None)
  bg='#edf1ed';outline='#d5ded7';width=2
  if entry:
   k,j=entry;bg=blue if k=='windows' else amber
   if entry in moved:outline=green if is_after else red;width=4
  d.rounded_rectangle((x,by,x+tile,by+115),radius=9,fill=bg,outline=outline,width=width)
  if entry:
   k,j=entry;cx=x+tile/2
   if k=='windows':
    d.rounded_rectangle((cx-21,by+15,cx+21,by+64),radius=12,fill='#ebf3ff',outline=blueink,width=3)
    d.line((cx,by+16,cx,by+63),fill=blueink,width=2);d.line((cx-20,by+42,cx+20,by+42),fill=blueink,width=2)
    center(cx,by+78,'В'+str(j+1),22,blueink,True)
   else:
    d.rounded_rectangle((cx-26,by+23,cx+26,by+61),radius=7,fill='#e5aa53',outline=amberink,width=3)
    d.line((cx-25,by+38,cx+25,by+38),fill=amberink,width=3);d.rectangle((cx-4,by+33,cx+4,by+46),fill='#ffe6b3',outline=amberink,width=2)
    center(cx,by+78,'С'+str(j+1),22,amberink,True)
  elif i==13:center(x+tile/2,by+42,'Выход',18,muted,True)
  else:d.line((x+35,by+56,x+55,by+56),fill='#b7c3ba',width=3)
 if is_after:
  txt(58,y+272,'Все 3 витража и 2 сундука сохранены. Правила соблюдены.',22,green,True)
 else:
  txt(58,y+272,'Красная рамка: объекты, которые генератор впоследствии перенёс.',22,red)

panel(199,'1. МОЙ СЕТАП','windows.items: [2, 3, 8]     chests.items: [5, 9]',False)
center(W/2,536,'↓  РЕАЛЬНЫЙ РЕЗУЛЬТАТ buildFloorLayout  ↓',21,muted,True)
after_windows=[v['offset'] for v in r['result']['placements']['windows']]
after_chests=[v['offset'] for v in r['result']['placements']['chests']]
panel(579,'2. ПОСЛЕ АВТОКОРРЕКЦИИ',f'windows: {after_windows}     chests: {after_chests}',True)
# Read every correction from the generator output, not from a hand-drawn target.
for i,w in enumerate(warnings):
 x=52+i*470;label=('В' if w['category']=='windows' else 'С')+str(w['index']+1)
 d.rounded_rectangle((x,932,x+450,988),radius=12,fill='#e0eee5')
 center(x+225,944,f'{label}: {w["fromOffset"]} → {w["toOffset"]}',26,green,True)
txt(52,1014,'Цепочка: В2 → 4, поэтому сундук С1 на секции 5 тоже стал соседом витража.',23,ink)
txt(52,1053,'Генератор выдал 3 предупреждения. Исходный JSON остался без изменений.',22,muted)
out=Path('output/level-rules/autocorrect-before-after.png');im.save(out)
print(str(out.resolve()))
