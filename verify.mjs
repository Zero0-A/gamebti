import vm from 'node:vm';
import {readFileSync,existsSync}from 'node:fs';
import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('./dist/data.js',import.meta.url),'utf8'),context);
const d=context.window.GameData,source=JSON.parse(readFileSync(new URL('./content/personality-source.json',import.meta.url),'utf8'));
assert.equal(Object.keys(d.types).length,42);assert.equal(d.rounds.length,3);
assert.equal(new Set(d.rounds.flat()).size,42);
for(const pool of d.rounds)assert.equal(pool.length,14);
const slots=new Set();
for(const row of source['人格完整表']){
 const t=d.types[row['编号']];assert.equal(t.name,row['人格']);assert.equal(t.intro,row['解释']);assert.equal(t.distinction,row['容易混淆的区别']);assert.equal(t.example,row['典型表现']);assert.ok(existsSync(new URL('./dist/'+t.sheet,import.meta.url)));slots.add(t.sheet+':'+t.spriteIndex);
}
assert.equal(slots.size,42);
function fill(a,round,score=4){for(const id of d.buildPlan(a,round))if(!d.has(a,id))a[id]=score;}
for(const code of Object.keys(d.types)){
 const a={},r=d.rounds.findIndex(pool=>pool.includes(code+'A'));
 for(let n=0;n<=r;n++){for(const id of d.rounds[n])a[id]=id===code+'A'?4:0;fill(a,n);}
 const out=d.calculate(a,r);assert.equal(out.code,code);assert.equal(out.primaryIds.length,1);
}
const a={},asked=new Set();
for(let r=0;r<3;r++){
 for(const id of d.rounds[r])a[id]=3;fill(a,r,3);
 const plan=d.buildPlan(a,r);assert.equal(plan.length,16);for(const id of plan){assert.ok(!asked.has(id));asked.add(id);}
 const out=d.calculate(a,r);assert.equal(out.primaryIds.length,r+1);assert.equal(out.final,r===2);assert.equal(new Set(out.primaryIds).size,r+1);assert.ok(out.roundResults[r].tied.length>1);
}
const na={};for(let r=0;r<3;r++){for(const id of d.rounds[r])na[id]=5;assert.equal(d.buildPlan(na,r).length,14);assert.equal(d.calculate(na,r).code,null);}
assert.equal(d.calculate(na,2).notApplicable,42);
const weak={};for(const id of d.rounds[0])weak[id]=0;assert.equal(d.calculate(weak).code,null);
weak[d.rounds[0][0]]=4;fill(weak,0,5);assert.equal(d.calculate(weak).code,null);
weak[d.rounds[0][0].replace('A','B')]=0;assert.equal(d.calculate(weak).code,null);
weak[d.rounds[0][0].replace('A','B')]=2;assert.ok(d.calculate(weak).code);
assert.throws(()=>d.calculate({}));assert.throws(()=>d.buildPlan({},3));assert.throws(()=>d.calculate({...weak,[d.rounds[0][0]]:99}));
console.log('Verified source fidelity, all 42 types reachable, three disjoint 14–16 question rounds, immediate results, cumulative unique combo, ties and N/A.');
