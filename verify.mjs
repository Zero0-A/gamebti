import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const context={window:{}};vm.runInNewContext(readFileSync(new URL('./dist/data.js',import.meta.url),'utf8'),context);
const {types,questions,calculate}=context.window.GameData;
assert.equal(Object.keys(types).length,16);assert.equal(questions.length,16);
for(let axis=0;axis<4;axis++)assert.equal(questions.filter(q=>q.axis===axis).length,4);
for(const [code,t] of Object.entries(types)){assert.ok(types[t.mate]);assert.equal(t.habits.length,3);const answers=questions.map(q=>q.scores.indexOf(['E','S','T','J'][q.axis]===code[q.axis]?2:-2));const result=calculate(answers);assert.equal(result.code,code);result.percentages.forEach((p,i)=>assert.equal(p,['E','S','T','J'][i]===code[i]?100:0));}
const balanced=questions.map(q=>q.scores.indexOf(questions.filter(x=>x.axis===q.axis).indexOf(q)<2?2:-2));const result=calculate(balanced);assert.ok(result.percentages.every(p=>p===50));assert.equal(result.code,'ESTJ');
assert.throws(()=>calculate([0]));assert.throws(()=>calculate(Array(16).fill(null)));assert.throws(()=>calculate(Array(16).fill(4)));
console.log('Verified: 16 complete profiles, 4 balanced axes, all 16 reachable outcomes, tie handling and invalid-answer rejection.');
