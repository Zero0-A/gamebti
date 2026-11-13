import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// 用独立内存存储执行真实页面事件，不接触试玩浏览器的进度与图鉴。
function page(storage,copyMode='manual'){
  const listeners={},elements=new Map(),timers=new Map();let timerId=0,answerButtons=[],scrolls=0,copiedText='',selections=0;
  function element(key){
    if(elements.has(key))return elements.get(key);
    let html='';const events={},classes=new Set();
    const e={dataset:{},style:{},hidden:false,open:false,disabled:false,textContent:'',
      classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
      addEventListener:(name,fn)=>events[name]=fn,events,
      setAttribute(){},focus(){},select(){selections++;},after(){},insertBefore(){},close(){e.open=false;},showModal(){e.open=true;},showPopover(){e.popoverOpen=true;},hidePopover(){e.popoverOpen=false;},
      querySelector:s=>element(key+' '+s),querySelectorAll:()=>[],
      get innerHTML(){return html;},set innerHTML(value){html=value;if(key==='#quiz')answerButtons=[0,1,2,3].map(index=>({dataset:{answer:String(index)},disabled:false,classList:{add(){}},setAttribute(){}}));}
    };elements.set(key,e);return e;
  }
  const document={body:{dataset:{},classList:{add(){},remove(){}}},
    querySelector:s=>/^\[data-answer="(\d)"\]$/.test(s)?answerButtons[Number(s.match(/\d/)[0])]:element(s),
    querySelectorAll:s=>s==='#quiz button'?answerButtons:[],
    addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),
    execCommand:()=>{if(copyMode==='fallback'){copiedText=element('#share-dialog textarea').value;return true;}throw Error('Clipboard unavailable');}};
  const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  const sandbox={window:{},document,localStorage,URL,URLSearchParams,
    matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){scrolls++;},addEventListener(){},confirm:()=>true,
    navigator:{clipboard:{writeText:async text=>{if(copyMode!=='clipboard')throw Error('Clipboard denied');copiedText=text;}},...(copyMode.startsWith('native')?{share:async data=>{if(copyMode==='native-cancel')throw Object.assign(Error('Cancelled'),{name:'AbortError'});if(copyMode==='native-fail')throw Error('Share failed');copiedText=data.url;}}:{})},isSecureContext:copyMode!=='manual',
    location:{href:'http://127.0.0.1:4173/',hash:'',protocol:copyMode.startsWith('native')?'https:':'http:'},
    setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id)};
  vm.createContext(sandbox);
  element('meta[name="gamebti-share-url"]').content=readFileSync(new URL('./dist/index.html',import.meta.url),'utf8').match(/<meta name="gamebti-share-url" content="([^"]+)">/)[1];
  for(const file of ['data.js','round-content.js','rounds.js','collection.js','vendor/qrcodegen.js','card-qr.js','share.js','app.js'])vm.runInContext(readFileSync(new URL('./dist/'+file,import.meta.url),'utf8'),sandbox);
  const click=b=>{const event={target:{closest:()=>b,tagName:'BUTTON'}};for(const fn of listeners.click)fn(event);};
  const action=(value,code)=>{const button={dataset:{action:value,...(code?{cardCode:code}:{})},disabled:false};click(button);return button;};
  const choose=i=>click(answerButtons[i]);
  const flush=()=>{for(const[id,t]of [...timers])if(t.ms===180){timers.delete(id);t.fn();}};
  return {element,action,choose,flush,scrolls:()=>scrolls,copied:()=>copiedText,selections:()=>selections,resultType:code=>click({dataset:{resultType:code},disabled:false}),resume:()=>element('#resume-button').events.click(),saved:()=>JSON.parse(storage.get('gamebti-rounds-save-v2'))};
}
const storage=new Map([['gamebti-behaviors-save-v2','legacy-answer-sentinel'],['gamebti-save-v1','older-answer-sentinel'],['gamebti-rounds-save-v1','previous-rounds-sentinel']]);
let p=page(storage);p.action('start');
assert.match(p.element('#quiz').innerHTML,/1 \/ 12/);
assert.ok(!p.element('#quiz').innerHTML.includes('data-action="next"'));
p.choose(0);p.choose(1);assert.equal(p.saved().rounds[0].answers.length,1);p.flush();
assert.match(p.element('#quiz').innerHTML,/2 \/ 12/);
p.action('previous');assert.match(p.element('#quiz').innerHTML,/1 \/ 12/);
p.choose(2);p.flush();assert.equal(p.saved().rounds[0].answers[0],2);
const beforeRefresh=p.element('#quiz').innerHTML;
p.action('home');p=page(storage);p.resume();assert.match(p.element('#quiz').innerHTML,/2 \/ 12/);
assert.equal(p.element('#quiz').innerHTML,beforeRefresh,'Refresh must preserve the exact question and option order');
for(let n=1;n<=6;n++){
  const already=p.saved().rounds.at(-1).answers.length;
  for(let i=already;i<12;i++){p.choose(i%4);p.flush();}
  assert.equal(p.saved().stage,'result');
  const html=p.element('#result').innerHTML;
  assert.ok(html.includes('is-revealed'),'New personality gets a reveal animation');
  const unlocked=[...html.matchAll(/data-result-type="(G\d+)"/g)].map(match=>match[1]);
  assert.equal(unlocked.length,n);
  const progressBefore=JSON.stringify(p.saved()),scrollsBefore=p.scrolls();p.resultType(unlocked[0]);
  assert.equal(p.scrolls(),scrollsBefore,'Switching personalities must preserve scroll position');
  assert.ok(p.element('#result').innerHTML.includes(`<div class="identity-code">${unlocked[0]}</div>`));
  assert.ok(!p.element('#result').innerHTML.includes('is-revealed'),'Switching cards does not replay unlock');
  assert.equal(JSON.stringify(p.saved()),progressBefore,'Viewing cards does not change answers');
  assert.match(html,new RegExp(`已收集 ${n} 张`));
  assert.equal(html.includes('data-action="finish"'),n>=3);
  assert.equal(html.includes('data-action="continue"'),n<6);
  const book=JSON.parse(storage.get('gamebti-collection-v2'));assert.equal(Object.keys(book.entries).length,n);
  if(n===3){
    const endedStore=new Map(storage),ended=page(endedStore);ended.resume();ended.action('finish');
    assert.equal(ended.saved().stage,'ended');assert.ok(!ended.element('#result').innerHTML.includes('data-action="continue"'));
    const completion=ended.element('#result').innerHTML;
    assert.ok(completion.includes('completion-page'));assert.ok(completion.includes('data-action="home"'));
    assert.equal([...completion.matchAll(/class="completion-card /g)].length,3);
    assert.ok(!completion.includes('data-action="finish"'));
    ended.action('home');assert.equal(ended.element('#home').hidden,false);assert.equal(ended.saved().stage,'ended');
    const reload=page(endedStore);reload.resume();assert.match(reload.element('#result').innerHTML,/本局完成/);
  }
  if(n<6){p=page(storage);p.resume();p.action('continue');assert.ok(p.element('#quiz').innerHTML.includes('探索中'));}
}
p.action('finish');assert.equal(p.saved().stage,'ended');
assert.equal([...p.element('#result').innerHTML.matchAll(/class="completion-card /g)].length,6);
p.action('home');p.resume();assert.ok(p.element('#result').innerHTML.includes('completion-page'));
p.action('start');assert.equal(p.saved().stage,'quiz');assert.equal(Object.keys(JSON.parse(storage.get('gamebti-collection-v2')).entries).length,6);
assert.equal(storage.get('gamebti-behaviors-save-v2'),'legacy-answer-sentinel');
assert.equal(storage.get('gamebti-save-v1'),'older-answer-sentinel');
assert.equal(storage.get('gamebti-rounds-save-v1'),'previous-rounds-sentinel');
for(const mode of ['clipboard','fallback','manual']){
  const copy=page(new Map(),mode),field=copy.element('#share-dialog textarea');field.value='GameBTI share text and link';
  const button=copy.action('copy-share');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(button.disabled,false,'Copy button remains usable after success or failure');
  if(mode==='manual'){assert.equal(copy.selections(),1);assert.ok(copy.element('#toast').textContent.includes('Ctrl+C'));}
  else{assert.equal(copy.copied(),field.value);assert.equal(button.textContent,'已复制 ✓');}
}
for(const source of ['self','friend']){
  const shareStore=new Map([['gamebti-collection-v2',JSON.stringify({version:1,entries:{G015:{[source]:true}}})]]);
  const collection=page(shareStore,'clipboard');
  collection.action('copy-link','G015');await new Promise(resolve=>setImmediate(resolve));
  assert.match(collection.copied(),/#meet=G015/,'Collection sharing works without a current result');
  assert.ok(collection.copied().includes('https://gamebti.app.workbuddy.host/?sharecode=UVPWTOVNVN#meet=G015'),'Copy links and exported QR codes use the same public address');
  assert.equal(collection.element('#toast').popoverOpen,true,'Feedback must be in the top layer above collection dialogs');
  assert.equal(shareStore.has('gamebti-rounds-save-v2'),false,'Sharing never creates a test session');
  collection.action('copy-link','G001');await new Promise(resolve=>setImmediate(resolve));
  assert.match(collection.copied(),/#meet=G015/,'Locked cards cannot be shared');
}
const selectedShare=page(storage,'clipboard'),unchanged=JSON.stringify(selectedShare.saved());
selectedShare.resume();
const selectedCode=Object.keys(JSON.parse(storage.get('gamebti-collection-v2')).entries)[0];
selectedShare.action('copy-link',selectedCode);await new Promise(resolve=>setImmediate(resolve));
assert.ok(selectedShare.copied().endsWith('#meet='+selectedCode));
assert.equal(JSON.stringify(selectedShare.saved()),unchanged,'Sharing a collected card preserves the current run');
console.log('Verified real app click handlers: automatic advance, double-click guard, previous/edit, refresh/resume, result rendering, finish gate, continue/exhaustion, collection unlock and legacy save preservation (DOM stubs, not a visual browser test).');
