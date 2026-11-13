import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

// 用独立内存存储执行真实页面事件，不接触试玩浏览器的进度与图鉴。
function page(storage){
  const listeners={},elements=new Map(),timers=new Map();let timerId=0,answerButtons=[];
  function element(key){
    if(elements.has(key))return elements.get(key);
    let html='';const events={},classes=new Set();
    const e={dataset:{},style:{},hidden:false,open:false,disabled:false,textContent:'',
      classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),toggle:(v,on)=>on?classes.add(v):classes.delete(v)},
      addEventListener:(name,fn)=>events[name]=fn,events,
      setAttribute(){},focus(){},after(){},insertBefore(){},close(){e.open=false;},showModal(){e.open=true;},
      querySelector:s=>element(key+' '+s),querySelectorAll:()=>[],
      get innerHTML(){return html;},set innerHTML(value){html=value;if(key==='#quiz')answerButtons=[0,1,2,3].map(index=>({dataset:{answer:String(index)},disabled:false,classList:{add(){}},setAttribute(){}}));}
    };elements.set(key,e);return e;
  }
  const document={body:{dataset:{},classList:{add(){},remove(){}}},
    querySelector:s=>/^\[data-answer="(\d)"\]$/.test(s)?answerButtons[Number(s.match(/\d/)[0])]:element(s),
    querySelectorAll:s=>s==='#quiz button'?answerButtons:[],
    addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)};
  const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
  const sandbox={window:{},document,localStorage,URL,URLSearchParams,
    matchMedia:()=>({matches:false,addEventListener(){}}),scrollTo(){},addEventListener(){},confirm:()=>true,
    location:{href:'http://127.0.0.1:4173/',hash:'',protocol:'http:'},
    setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id)};
  vm.createContext(sandbox);
  for(const file of ['data.js','round-content.js','rounds.js','collection.js','app.js'])vm.runInContext(readFileSync(new URL('./dist/'+file,import.meta.url),'utf8'),sandbox);
  const click=b=>{const event={target:{closest:()=>b,tagName:'BUTTON'}};for(const fn of listeners.click)fn(event);};
  const action=value=>click({dataset:{action:value},disabled:false});
  const choose=i=>click(answerButtons[i]);
  const flush=()=>{for(const[id,t]of [...timers])if(t.ms===180){timers.delete(id);t.fn();}};
  return {element,action,choose,flush,resultType:code=>click({dataset:{resultType:code},disabled:false}),resume:()=>element('#resume-button').events.click(),saved:()=>JSON.parse(storage.get('gamebti-rounds-save-v2'))};
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
  const progressBefore=JSON.stringify(p.saved());p.resultType(unlocked[0]);
  assert.ok(p.element('#result').innerHTML.includes(`<div class="identity-code">${unlocked[0]}</div>`));
  assert.ok(!p.element('#result').innerHTML.includes('is-revealed'),'Switching cards does not replay unlock');
  assert.equal(JSON.stringify(p.saved()),progressBefore,'Viewing cards does not change answers');
  assert.match(html,new RegExp(`本局已获得 ${n} 个不同人格`));
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
    const reload=page(endedStore);reload.resume();assert.match(reload.element('#result').innerHTML,/这一局，收好了/);
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
console.log('Verified real app click handlers: automatic advance, double-click guard, previous/edit, refresh/resume, result rendering, finish gate, continue/exhaustion, collection unlock and legacy save preservation (DOM stubs, not a visual browser test).');
