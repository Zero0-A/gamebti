const {types,tags,questions,rules,version}=content;
const byId=Object.fromEntries(questions.map(q=>[q.id,q]));
const queues=Object.fromEntries(['team','content','self','interaction','motivation','engagement','completion'].map(group=>[group,questions.filter(q=>q.phase==='initial'&&types[q.code].group===group)]));
const initial=[];while(Object.values(queues).some(queue=>queue.length)){for(const queue of Object.values(queues)){if(queue.length)initial.push(queue.shift().id);}}
const rounds=[0,1,2].map(n=>initial.filter((id,i)=>i%3===n));
const extras=questions.filter(q=>q.phase==='extra').map(q=>q.id);
const has=(answers,id)=>!!byId[id]&&Object.prototype.hasOwnProperty.call(answers,id)&&Number.isInteger(answers[id])&&answers[id]>=0&&answers[id]<byId[id].options.length;
const value=(answers,id)=>has(answers,id)?byId[id].options[answers[id]].value:null;
function buildPlan(answers,round=0){
 if(!rounds[round])throw Error('无效小轮');
 const pool=rounds[round];
 if(!pool.every(id=>has(answers,id)))return [...pool];
 const candidates=pool.filter(id=>value(answers,id)!==null&&value(answers,id)>=2).sort((a,b)=>value(answers,b)-value(answers,a)||a.localeCompare(b)).slice(0,2);
 return [...pool,...candidates.map(id=>byId[id].code+'B')];
}
function calculate(answers,throughRound=0){
 const roundResults=[],evaluated=[];let answered=0,notApplicable=0;
 for(let round=0;round<=throughRound;round++){
  const plan=buildPlan(answers,round);
  if(!plan.every(id=>has(answers,id)))throw Error('请先完成本小轮');
  answered+=plan.length;notApplicable+=plan.filter(id=>value(answers,id)===null).length;
  const scores=rounds[round].map(id=>{
   const code=byId[id].code,ids=plan.filter(q=>byId[q].code===code&&value(answers,q)!==null);
   const evidence=ids.map(id=>({id,question:byId[id].title,answer:byId[id].options[answers[id]].label,value:value(answers,id)}));
   const mean=evidence.length?evidence.reduce((sum,e)=>sum+e.value,0)/evidence.length:null;
   return {code,evidence,applicable:evidence.length,mean,strong:evidence.length>=2&&evidence.every(e=>e.value>=2),first:value(answers,id)};
  });
  const ranked=scores.filter(e=>e.strong).sort((a,b)=>b.mean-a.mean||b.first-a.first||a.code.localeCompare(b.code));
  const winner=ranked[0];
  roundResults.push({round,code:winner?.code??null,tied:ranked.filter(e=>e.mean===winner?.mean&&e.first===winner?.first).map(e=>e.code),answered:plan.length});
  evaluated.push(...scores);
 }
 const primaryIds=roundResults.flatMap(r=>r.code?[r.code]:[]),ranked=evaluated.filter(e=>e.strong).sort((a,b)=>b.mean-a.mean||a.code.localeCompare(b.code));
 return {version,code:primaryIds.at(-1)??null,primaryIds,ranked,labels:[],evaluated,answered,notApplicable,insufficient:!primaryIds.length,roundResults,roundIndex:throughRound,final:throughRound===2};
}
return {version,types,tags,questions,byId,initial,rounds,extras,rules,has,value,buildPlan,calculate};
