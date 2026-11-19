import sys
sys.stdout.reconfigure(encoding="utf-8")
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.pagesizes import A4
from xml.sax.saxutils import escape
from pypdf import PdfReader

pdfmetrics.registerFont(TTFont('Arial','C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('ArialBold','C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('Arial',normal='Arial',bold='ArialBold',italic='Arial',boldItalic='ArialBold')
OUT='output/pdf/Sunny_RNG_streams.pdf'
INK=colors.HexColor('#1C302A'); GREEN=colors.HexColor('#307655'); MUTED=colors.HexColor('#5F7169'); PALE=colors.HexColor('#EFF5EF'); LINE=colors.HexColor('#D8E3DA')
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name='TitleR',fontName='ArialBold',fontSize=26,leading=30,textColor=INK,spaceAfter=12))
styles.add(ParagraphStyle(name='SubR',fontName='Arial',fontSize=12,leading=17,textColor=MUTED,spaceAfter=17))
styles.add(ParagraphStyle(name='H1R',fontName='ArialBold',fontSize=16,leading=21,textColor=INK,spaceAfter=12))
styles.add(ParagraphStyle(name='H2R',fontName='ArialBold',fontSize=11,leading=15,textColor=GREEN,spaceBefore=13,spaceAfter=6))
styles.add(ParagraphStyle(name='BodyR',fontName='Arial',fontSize=10,leading=15,textColor=INK,spaceAfter=8))
styles.add(ParagraphStyle(name='SmallR',fontName='Arial',fontSize=8.4,leading=12,textColor=MUTED,spaceAfter=5))
styles.add(ParagraphStyle(name='CellR',fontName='Arial',fontSize=9,leading=12.5,textColor=INK))
styles.add(ParagraphStyle(name='CellHeadR',fontName='ArialBold',fontSize=9,leading=12,textColor=colors.white))
W=A4[0]-96

def P(t,style='BodyR'):return Paragraph(t,styles[style])
def H(t):return P(t,'H2R')
def box(title,body):
 t=Table([[P(title,'H2R')],[P(body)]],colWidths=[W])
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),13),('RIGHTPADDING',(0,0),(-1,-1),13),('TOPPADDING',(0,0),(-1,0),0),('BOTTOMPADDING',(0,-1),(-1,-1),5)]))
 return t

def grid(headers,rows,widths):
 data=[[P(h,'CellHeadR') for h in headers]]+[[P(str(c),'CellR') for c in row] for row in rows]
 t=Table(data,colWidths=widths,repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),GREEN),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),9),('RIGHTPADDING',(0,0),(-1,-1),9),('TOPPADDING',(0,0),(-1,-1),8),('BOTTOMPADDING',(0,0),(-1,-1),8),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,PALE]),('LINEBELOW',(0,0),(-1,0),.5,GREEN),('LINEBELOW',(0,1),(-1,-1),.4,LINE)]))
 return t

def page(c,doc):
 c.setFillColor(GREEN);c.rect(0,A4[1]-9,A4[0],9,fill=1,stroke=0)
 c.setFont('ArialBold',8);c.setFillColor(MUTED);c.drawString(48,A4[1]-35,'SUNNY / ИГРОВЫЕ СИСТЕМЫ')
 c.setFont('Arial',8);c.drawRightString(A4[0]-48,A4[1]-35,'19.11.2026 · RNG v1')
 c.setStrokeColor(LINE);c.line(48,44,A4[0]-48,44)
 c.setFont('Arial',8);c.drawString(48,29,'Разделение случайности на независимые потоки')
 c.drawRightString(A4[0]-48,29,str(doc.page))

story=[P('RNG: карта потоков','TitleR'),P('Как устроена случайность в «Солнечном зайчике»','SubR'),
 box('16 типов потоков в 7 семействах','10 типов отвечают за генерацию этажей, ещё 6 - за геометрию и игровые результаты. Это число <b>типов</b>, а не одновременно живущих генераторов: отдельные экземпляры создаются для этажей, секций и объектов.'),Spacer(1,13),
 H('Общий сид, независимые последовательности'),
 P('У забега один сид. Из него, версии алгоритма и пути потока вычисляется начальное состояние генератора. Путь содержит назначение потока и устойчивую идентичность объекта: например, ID этажа и номер секции сундука.'),
 P('<b>Сид забега + версия RNG + путь объекта → отдельный генератор.</b>'),
 P('Вызов генератора продвигает только его собственную последовательность. Открытие сундука A не расходует случайные значения сундука B; создание партиклов не меняет лут. На одном и том же потоке порядок и число вызовов по-прежнему имеют значение.'),
 H('Три способа получить случайность'),
 grid(['Метод','Поведение и назначение'],[
 ('<b>create(...path)</b>','Новая последовательность с начала указанного пути. Подходит для содержимого конкретного сундука и генерации этажа. Повторное создание с тем же путём повторяет результат.'),
 ('<b>stream(...path)</b>','Один зарегистрированный поток на путь. Повторный запрос возвращает тот же объект и продолжает последовательность. Сейчас используется для порядка целей секретной арены.'),
 ('<b>sample(...path)</b>','Первая стабильная выборка для пути без сохранения счётчика. Подходит для ширины ступени и исходной фазы босса.')],[125,W-125]),
 H('Что намеренно не входит в менеджер'),
 P('Партиклы, звук, текстуры, декоративная трава и лианы используют обычный <b>Math.random</b>. Их внешний вид не воспроизводится по сиду и не сохраняется в RNG-состоянии. Параметр плавной анимации можно выбрать случайно один раз на объект, чтобы он не дрожал от новых выборок каждый кадр.'),
 PageBreak(),P('01 / Генерация этажей','H1R'),
 P('Семейство <b>layout</b> содержит 10 типов. Путь каждого экземпляра: <b>layout / seed конфигурации / ID этажа / категория</b>. Настройка seed в floors.json служит дополнительной частью пути и не заменяет сид забега.'),
 grid(['№','Категория','За что отвечает'],[
 ('1','<b>steps</b>','Количество и размещение пропусков ступеней в режиме generated. Заданные вручную ступени в режиме explicit не переигрываются рандомом.'),
 ('2','<b>windows</b>','Количество и позиции витражей на этаже. Размеры и прочие заданные параметры берутся из конфигурации.'),
 ('3','<b>loot</b>','Количество и позиции мест с лутом; выбор ID из заданного пула. Содержимое такого места уточняет отдельное семейство loot.'),
 ('4','<b>enemies</b>','Количество и позиции врагов, выбор их типов из пула конфигурации.'),
 ('5','<b>shadows</b>','Количество и позиции теневых зон.'),
 ('6','<b>chests</b>','Количество и позиции сундуков. Их содержимое рассчитывается отдельно, по идентичности каждого сундука.'),
 ('7','<b>bottles</b>','Количество и позиции бутылок в режиме generated.'),
 ('8','<b>books</b>','Количество и позиции игровых источников падающих книг. Декоративные книги к этому потоку не относятся.'),
 ('9','<b>springboards</b>','Количество и позиции пружинящих площадок.'),
 ('10','<b>threats</b>','Количество и позиции опасностей; выбор типа опасности из пула.')],[33,104,W-137]),
 H('Независимые числа, но общая площадь'),
 P('Категории занимают общие свободные секции. Ручные размещения, секретный вход и выход этажа резервируют места; пропуски ступеней исключают места из генерации. Поэтому изменение витражей может сдвинуть врагов из-за занятых секций, хотя их RNG-последовательность остаётся независимой.'),
 P('Для диапазона количества, например [2, 3], генератор учитывает доступную вместимость и оставляет минимум мест последующим категориям. Если обязательные значения не помещаются, возвращается ошибка конфигурации. Режим explicit сохраняет авторские размещения.'),
 PageBreak(),P('02 / Игровые результаты','H1R'),
 grid(['Семейство и путь','Результат'],[
 ('<b>geometry / shelves / секция</b>','Стабильная выборка ширины ступени. Видимая геометрия и проверка опоры получают одинаковое значение при повторных расчётах.'),
 ('<b>loot / ID этажа / секция</b>','Количество камней и выбор их типов в исходном месте лута. Учитываются заданный ID, пул и изученные улучшения.'),
 ('<b>chests / ID этажа / секция</b>','Количество и типы камней из конкретного сундука. Диапазон берётся из interactables.json; порядок открытия других сундуков не влияет.'),
 ('<b>secret-layout / ID этажа</b>','Вариация проходимой формы секретной дороги и арены, позиции целей. Декоративное наполнение получает обычный графический рандом.'),
 ('<b>secret-order / секция</b>','Перемешивание пяти целей при входе в секретную арену. Это продолжаемый поток: новый вызов shuffle продвигает его состояние.'),
 ('<b>enemies / индекс арены / boss-phase</b>','Исходная игровая фаза босса. Это конкретная выборка; отдельный RNG для всех решений AI пока не подключён.')],[187,W-187]),
 H('Повтор забега и сохранение'),
 P('Игра записывает сид в параметр <b>seed</b> ссылки. Открытие той же ссылки и «Начать заново» повторяют игровые случайности. «Следующий забег» удаляет прежний сид и получает новый. Для одинакового результата нужны те же версия игры, конфигурация и изученные навыки; один сид не фиксирует движение игрока и время событий.'),
 P('<b>snapshot / restore</b> сохраняют и восстанавливают состояние зарегистрированных потоков stream в JSON, с проверкой сида и версии. Независимые генераторы create в снимок менеджера не входят; sample не имеет продолжаемого состояния. Для полного сохранения забега отдельно нужны состояние мира и игрока.'),
 H('Алгоритм и проверка'),
 P('Используется xorshift32 (13, 17, 5), версия 1; нулевое состояние исключено. float выдаёт [0, 1), int(min, max) включает обе границы и отбрасывает неполный диапазон перед делением. Проверены эталонная последовательность, изоляция потоков, восстановление, сундуки и генерация 200 сидов.'),
 P('Реализация: src/rng.js, src/run-rng.js, src/floor-config.js, src/run-loot.js, src/game.js, src/main.js, src/secret-levels.js, src/floor-arenas.js. Проверки: tests/rng.test.js.','SmallR'),
 P('Идея независимых подсидов: <link href="https://www.reddit.com/r/bindingofisaac/comments/3p5a03/rnjesus_an_introduction_on_how_rngs_are_used_and/" color="#307655"><u>RNJesus: RNG в Binding of Isaac Rebirth</u></link>. Описание выше отражает реализацию Sunny, а не точную копию системы Isaac.','SmallR')]

doc=SimpleDocTemplate(OUT,pagesize=A4,rightMargin=48,leftMargin=48,topMargin=62,bottomMargin=58,title='Sunny: разделение RNG на потоки',author='Freja',subject='Архитектура игрового рандома Sunny')
doc.build(story,onFirstPage=page,onLaterPages=page)
r=PdfReader(OUT)
print('PDF:',OUT,'pages:',len(r.pages))
for i,p in enumerate(r.pages): print(i+1,len(p.extract_text()),p.extract_text()[:70].replace('\n',' '))
assert len(r.pages)==3
assert 'secret-order' in r.pages[2].extract_text()
