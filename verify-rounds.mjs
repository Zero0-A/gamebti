import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const context={window:{}};
for(const file of ['data.js','round-content.js','rounds.js'])vm.runInNewContext(readFileSync(new URL('./dist/'+file,import.meta.url),'utf8'),context);
const d=context.window.GameData,r=context.window.GameRounds;
const codes=r.groups.flatMap(g=>Object.keys(g.profiles));
assert.equal(codes.length,42);assert.equal(new Set(codes).size,42);
assert.deepEqual([...codes].sort(),Object.keys(d.types).sort());
const ids=new Set(),titles=new Set();
let seed=731;
const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
function distance(g,answers,profile){
  const totals=[0,0,0,0],counts=[0,0,0,0];
  g.questions.forEach((q,i)=>q.axes.forEach((axis,j)=>{totals[axis]+=q.options[answers[i]].values[j];counts[axis]++;}));
  return totals.reduce((sum,v,i)=>sum+(v/counts[i]-profile[i])**2,0);
}
function findExample(g,code,profile,template={}){
  for(let attempt=0;attempt<64;attempt++){
    const answers=g.questions.map(()=>Math.floor(random()*4));
    for(let sweep=0;sweep<20;sweep++){
      let changed=false;
      for(let i=0;i<12;i++){
        const previous=answers[i];let best=previous,loss=distance(g,answers,profile);
        for(let choice=0;choice<4;choice++){answers[i]=choice;const candidate=distance(g,answers,profile);if(candidate<loss-1e-9){loss=candidate;best=choice;}}
        if(previous!==best)changed=true;answers[i]=best;
      }
      if(r.score({...template,groupId:g.id,answers}).code===code)return [...answers];
      if(!changed)break;
    }
  }
  assert.fail(`No valid answer example for ${code}`);
}
for(const g of r.groups){
  assert.ok(Object.keys(g.profiles).length>=6&&Object.keys(g.profiles).length<=8);
  assert.equal(g.questions.length,24);
  const counts=[0,0,0,0];
  for(const q of g.questions){
    assert.ok(!ids.has(q.id));ids.add(q.id);assert.ok(!titles.has(q.title));titles.add(q.title);
    assert.equal(q.axes.length,2);q.axes.forEach(axis=>counts[axis]++);
    assert.equal(q.options.length,4);
    assert.equal(new Set(q.options.map(o=>o.label)).size,4);
    for(const option of q.options){assert.equal(option.values.length,2);assert.ok(option.values.every(v=>Number.isFinite(v)&&v>=0&&v<=4));assert.ok(!('code' in option));assert.ok(!('types' in option));assert.ok(option.label.length>4);}
  }
  assert.deepEqual(counts,[12,12,12,12]);
  const baseline={...g,questions:g.questions.slice(0,12)};
  // 使用合法选项寻找完整作答样例，不再假设四个选项必须凑齐固定的极端组合。
  const examples=[];
  for(const [code,profile]of Object.entries(g.profiles)){
    assert.equal(profile.length,4);assert.ok(profile.every(v=>Number.isFinite(v)&&v>=0&&v<=4));
    const answers=findExample(baseline,code,profile);examples.push(answers);
    assert.equal(r.score({groupId:g.id,answers}).code,code,`unreachable: ${code}`);
  }
  // 固定任一题的任一答案，其他题仍能导向不同人格，不能一选就定型。
  for(let i=0;i<12;i++)for(let choice=0;choice<4;choice++){
    const outcomes=new Set(examples.map(example=>{const answers=[...example];answers[i]=choice;return r.score({groupId:g.id,answers}).code;}));
    assert.ok(outcomes.size>1,`${g.id} question ${i} choice ${choice} forces one personality`);
  }
  for(let sample=0;sample<4;sample++){
    const state=r.create();while(r.group(state).id!==g.id){for(let i=0;i<12;i++)r.answer(state,0);r.proceed(state);}
    const round=r.active(state),selected=[];
    for(let i=0;i<12;i++){round.index=i;selected.push(r.question(state));}round.index=0;
    const counts=[0,0,0,0];selected.forEach(q=>q.axes.forEach(axis=>counts[axis]++));assert.deepEqual(counts,[6,6,6,6]);
    const view={...g,questions:selected};
    for(const [code,profile]of Object.entries(g.profiles))findExample(view,code,profile,round);
    // 改变展示次序但保留相同的实际选择，评分必须相同。
    const answers=selected.map((_,i)=>i%4),original=r.score({...round,answers});
    const reversed={...round,questionOrder:[...round.questionOrder].reverse(),optionOrders:[...round.optionOrders].reverse().map(order=>[...order].reverse()),answers:[...answers].reverse().map(i=>3-i)};
    const reordered=r.score(reversed);assert.equal(original.code,reordered.code);assert.deepEqual([...original.vector],[...reordered.vector]);
  }
}
let state=r.create();const seenQuestions=new Set();
for(let n=1;n<=6;n++){
  assert.equal(state.stage,'quiz');assert.equal(state.rounds.length,n);
  assert.throws(()=>r.finish(state));assert.throws(()=>r.proceed(state));
  for(let i=0;i<12;i++){
    const q=r.question(state);assert.ok(!seenQuestions.has(q.id));seenQuestions.add(q.id);
    r.answer(state,i%4);assert.ok(r.restore(JSON.parse(JSON.stringify(state))));
    if(i<11)assert.equal(r.results(state).length,n-1);
  }
  assert.equal(state.stage,'result');assert.equal(r.results(state).length,n);
  assert.equal(new Set(r.results(state).map(x=>x.code)).size,n);
  assert.throws(()=>r.answer(state,0));
  if(n<3)assert.throws(()=>r.finish(state));
  else{const copy=r.restore(JSON.parse(JSON.stringify(state)));r.finish(copy);assert.equal(copy.stage,'ended');assert.equal(r.canContinue(copy),false);assert.ok(r.restore(copy));}
  if(n<6)r.proceed(state);else{assert.equal(r.canContinue(state),false);assert.throws(()=>r.proceed(state));r.finish(state);}
}
assert.equal(seenQuestions.size,72);
state=r.create();r.answer(state,0);r.answer(state,1);r.previous(state);r.answer(state,3);assert.deepEqual([...r.active(state).answers],[0,3]);
const saved=JSON.parse(JSON.stringify(state));
const restored=r.restore(saved);assert.deepEqual(JSON.parse(JSON.stringify(restored)),saved);
const current=r.question(state);r.previous(state);r.answer(state,r.active(state).answers[0]);
assert.equal(r.question(state).id,current.id);assert.deepEqual(r.question(state).options,current.options);
const layouts=new Set(Array.from({length:20},()=>JSON.stringify(r.active(r.create()))));assert.ok(layouts.size>1);
for(const mutate of [s=>s.rounds[0].questionOrder[1]=s.rounds[0].questionOrder[0],s=>s.rounds[0].questionOrder[0]=99,s=>s.rounds[0].optionOrders[0]=[0,0,2,3],s=>delete s.rounds[0].optionOrders]){const bad=structuredClone(saved);mutate(bad);assert.equal(r.restore(bad),null);}
const legacy=structuredClone(saved);delete legacy.rounds[0].questionOrder;delete legacy.rounds[0].optionOrders;
assert.ok(r.restore(legacy));assert.equal(r.question(r.restore(legacy)).id,r.byId[legacy.rounds[0].groupId].questions[legacy.rounds[0].index].id);
for(const mutate of [s=>s.order[1]=s.order[0],s=>s.rounds[0].answers[0]=99,s=>s.rounds[0].index=12,s=>s.stage='ended',s=>s.version='old',s=>s.rounds[0].groupId='unknown',s=>s.rounds[0].answers=[null],s=>s.stage='result']){const bad=structuredClone(saved);mutate(bad);assert.equal(r.restore(bad),null);}
assert.equal(r.restore(null),null);
console.log('Verified 144 unique questions, balanced random 12-question draws, shuffled option scoring, all 42 personalities reachable in baseline and sampled draws, stable saved layouts, legacy progress, three-round gate and six-round exhaustion.');
