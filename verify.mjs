import vm from 'node:vm';
import {readFileSync,existsSync}from 'node:fs';
import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('./dist/data.js',import.meta.url),'utf8'),context);
const d=context.window.GameData,source=JSON.parse(readFileSync(new URL('./content/personality-source.json',import.meta.url),'utf8'));
assert.equal(Object.keys(d.types).length,42);assert.equal(d.initial.length,42);assert.equal(d.tags.length,4);assert.equal(d.questions.length,90);
const spriteSlots=new Set();
for(const row of source['人格完整表']){
 const type=d.types[row['编号']];assert.ok(type);assert.equal(type.name,row['人格']);assert.equal(type.trait,row['主要特点']);assert.equal(type.intro,row['解释']);assert.equal(type.distinction,row['容易混淆的区别']);assert.equal(type.example,row['典型表现']);assert.equal(type.observation,row['出题观察点']);
 assert.ok(existsSync(new URL('./dist/'+type.sheet,import.meta.url)));assert.ok(type.spriteIndex>=0&&type.spriteIndex<14);spriteSlots.add(type.sheet+':'+type.spriteIndex);
}
assert.equal(spriteSlots.size,42);
const base=()=>Object.fromEntries(d.initial.map(id=>[id,0]));
const fill=(a,confirm=4)=>{for(const id of d.buildPlan(a)){if(!Object.prototype.hasOwnProperty.call(a,id))a[id]=d.byId[id].phase==='extra'?d.byId[id].options.length-1:confirm;}return a;};
for(const code of Object.keys(d.types)){const answers=base();answers[code+'A']=4;fill(answers);const r=d.calculate(answers);assert.equal(r.code,code);assert.equal(r.primaryIds.length,1);assert.equal(r.ranked[0].applicable,2);assert.equal(r.labels.length,0);}
const none=base();fill(none);assert.equal(d.calculate(none).code,null);
const skipped=Object.fromEntries(d.initial.map(id=>[id,5]));fill(skipped);assert.equal(d.calculate(skipped).insufficient,true);assert.equal(d.calculate(skipped).notApplicable,d.buildPlan(skipped).length);
const missingEvidence=base();missingEvidence.G001A=4;fill(missingEvidence,5);assert.equal(d.calculate(missingEvidence).code,null);assert.equal(d.calculate(missingEvidence).evaluated.find(x=>x.code==='G001').applicable,1);
const contradicted=base();contradicted.G001A=4;fill(contradicted,0);assert.equal(d.calculate(contradicted).code,null);
const tied=Object.fromEntries(d.initial.map(id=>[id,3]));fill(tied,3);assert.equal(d.buildPlan(tied).length,90);assert.equal(d.calculate(tied).primaryIds.length,42);
const extras=base();extras.G022A=4;fill(extras);const original=d.calculate(extras).code;extras.T001A=4;extras.T002A=2;extras.T002B=2;extras.T002C=2;extras.T003A=0;extras.T004A=4;assert.equal(d.calculate(extras).code,original);assert.equal(d.calculate(extras).labels.length,4);extras.T002A=0;assert.equal(d.calculate(extras).labels.some(t=>t.id==='T002'),false);
const revised=base();revised.G001A=4;revised.G002A=4;fill(revised);revised.G002A=0;assert.equal(d.calculate(revised).primaryIds.join(','),'G001');
assert.throws(()=>d.calculate({}));assert.throws(()=>d.calculate({...extras,G022A:99}));
console.log('Verified source fidelity, 42 reachable types and unique sprites, adaptive confirmation, ties, insufficient evidence, N/A exclusion and independent tags.');
