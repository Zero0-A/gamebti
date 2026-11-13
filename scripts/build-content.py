"""Build site content from the supplied workbook's read-only JSON extraction."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
source=json.loads((ROOT/'content/personality-source.json').read_text(encoding='utf-8'))
items=json.loads((ROOT/'content/items.json').read_text(encoding='utf-8'))
assert len(items)==42
groups={'团队相处':'team','自我要求':'self','游玩动机':'motivation','投入方式':'engagement','互动偏好':'interaction','内容偏好':'content','完成偏好':'completion'}
types={}
questions=[]
frequency=[{'label':label,'value':index}for index,label in enumerate(['从不','很少','有时','经常','几乎总是'])]+[{'label':'没经历过 / 不适用','value':None}]
for i,(row,item)in enumerate(zip(source['人格完整表'],items)):
    assert row['编号']==item['code']
    code=item['code'];group=row['观察方向']
    types[code]={'name':row['人格'],'en':group,'group':groups[group],'category':group,'trait':row['主要特点'],'intro':row['解释'],'example':row['典型表现'],'distinction':row['容易混淆的区别'],'observation':row['出题观察点'],'quote':item['quote'],'tip':item['tip'],'tags':[group],'sheet':f'assets/whale-types-{i//14+1:02}.png','spriteIndex':i%14}
    for phase,field,suffix in [('initial','first','A'),('confirm','confirm','B')]:
        questions.append({'id':code+suffix,'phase':phase,'code':code,'types':[code],'direction':'positive','context':group+' · '+('联机情境'if group=='团队相处'else'回想实际游玩'),'title':item[field],'sub':'回想最近几周真实发生的情况，不用选理想中的自己。','scale':'frequency','weight':1,'notApplicable':'exclude','options':frequency})
tags=[{'id':r['编号'],'name':r['标签'],'nature':r['性质'],'intro':r['解释'],'example':r['典型表现'],'usage':r['测试中的用途']}for r in source['附加标签']]
extras=[
 {'id':'T001A','tag':'T001','title':'即使提前知道一部分剧情，我仍愿意自己继续体验。','context':'剧情偏好 · 不参与人格排名','scale':'frequency','options':frequency},
 {'id':'T002A','tag':'T002','title':'回想最近一次联机，那时你是否已经困了，或者没什么继续玩的兴趣？','context':'当时状态 · 只描述那一次','scale':'state','options':[{'label':'没有，当时还挺想玩','value':0},{'label':'有一点累 / 兴趣淡了些','value':1},{'label':'已经明显累了 / 不想继续','value':2},{'label':'没联机过 / 记不清了','value':None}]},
 {'id':'T002B','tag':'T002','title':'还是那次联机：你是不是想结束了，却不好意思开口退出？','context':'当时状态 · 仍回想同一局','scale':'state','options':[{'label':'没有这种情况','value':0},{'label':'有过一点犹豫','value':1},{'label':'是的，想走但没好意思说','value':2},{'label':'不适用 / 记不清','value':None}]},
 {'id':'T002C','tag':'T002','title':'那次你是否因此不再主动推进，只在旁边偶尔回应队友？','context':'当时状态 · 不定义固定性格','scale':'state','options':[{'label':'没有，我还在正常参与','value':0},{'label':'参与少了一些','value':1},{'label':'是的，主要只在旁边回应','value':2},{'label':'不适用 / 记不清','value':None}]},
 {'id':'T003A','tag':'T003','title':'只说这次回想的游戏：需要操作时，你通常跟得上吗？','context':'操作自评 · 不代表所有游戏','scale':'skill','options':[{'label':'经常按不出来，需要别人接手','value':0},{'label':'有时卡操作，大体能自己完成','value':1},{'label':'多数操作都比较顺手','value':2},{'label':'没有这类操作 / 不适用','value':None}]},
 {'id':'T004A','tag':'T004','title':'当前任务还没做完时，我会被旁边的细节吸引，回过神才发现忘了继续。','context':'注意习惯 · 不参与人格排名','scale':'frequency','options':frequency}
]
for q in extras:q.update(phase='extra',types=[],direction='separate',weight=0,notApplicable='exclude',sub='补充标签单独记录，不参与主类型的计分。')
payload={'version':'gamebti-rounds-v3','types':types,'tags':tags,'questions':questions+extras,'rules':{'roundCount':3,'initialCountPerRound':14,'confirmationCandidates':2,'minimumApplicable':2,'minimumItemValue':2,'topCountPerRound':1,'ties':'first-score-then-code-with-notice','scale':'frequency-0-4','status':'prototype-unvalidated'}}
logic=(ROOT/'scripts/scoring.js').read_text(encoding='utf-8')
output="'use strict';\nwindow.GameData=(()=>{\nconst content="+json.dumps(payload,ensure_ascii=False,separators=(',',':'))+";\n"+logic+"\n})();\n"
(ROOT/'dist/data.js').write_text(output,encoding='utf-8')
print('Built 42 source-defined types, 84 behavior items and 6 separate label items.')
