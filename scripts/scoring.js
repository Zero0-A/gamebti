const {types,tags,questions,rules,version}=content;
const byId=Object.fromEntries(questions.map(q=>[q.id,q]));
const queues=Object.fromEntries(['team','content','self','interaction','motivation','engagement','completion'].map(group=>[group,questions.filter(q=>q.phase==='initial'&&types[q.code].group===group)]));
const initial=[];while(Object.values(queues).some(queue=>queue.length)){for(const queue of Object.values(queues)){if(queue.length)initial.push(queue.shift().id);}}
const extras=questions.filter(q=>q.phase==='extra').map(q=>q.id);
const has=(answers,id)=>Object.prototype.hasOwnProperty.call(answers,id)&&Number.isInteger(answers[id])&&answers[id]>=0&&answers[id]<byId[id].options.length;
const value=(answers,id)=>has(answers,id)?byId[id].options[answers[id]].value:null;
function buildPlan(answers){
  if(!initial.every(id=>has(answers,id)))return [...initial];
  const candidates=initial.map(id=>({id,score:value(answers,id)})).filter(item=>item.score!==null&&item.score>=2).sort((a,b)=>b.score-a.score);
  const cutoff=candidates.length?candidates[Math.min(rules.confirmationCandidates-1,candidates.length-1)].score:Infinity;
  const confirm=candidates.filter(item=>item.score>=cutoff).map(item=>byId[item.id].code+'B');
  return [...initial,...confirm,...extras];
}
function calculate(answers){
  const plan=buildPlan(answers);
  if(!initial.every(id=>has(answers,id))||!plan.every(id=>has(answers,id)))throw Error('请先完成这次测试的问题');
  const evaluated=Object.keys(types).map(code=>{
    const ids=plan.filter(id=>byId[id].code===code&&value(answers,id)!==null);
    const evidence=ids.map(id=>({id,question:byId[id].title,answer:byId[id].options[answers[id]].label,value:value(answers,id)}));
    const mean=evidence.length?evidence.reduce((sum,item)=>sum+item.value,0)/evidence.length:null;
    return {code,evidence,applicable:evidence.length,mean,strong:evidence.length>=rules.minimumApplicable&&mean>=rules.strongMean};
  });
  const ranked=evaluated.filter(item=>item.strong).sort((a,b)=>b.mean-a.mean||a.code.localeCompare(b.code));
  const cutoff=ranked.length?ranked[Math.min(rules.topCount-1,ranked.length-1)].mean:Infinity;
  const highlights=ranked.filter(item=>item.mean>=cutoff);
  const labelResults=[];
  const addTag=(id,note)=>{const tag=tags.find(t=>t.id===id);labelResults.push({...tag,note});};
  if(value(answers,'T001A')!==null&&value(answers,'T001A')>=3)addTag('T001','本次剧情偏好，不参与主类型排名。');
  const stateIds=['T002A','T002B','T002C'];
  if(stateIds.every(id=>value(answers,id)!==null&&value(answers,id)>0)&&stateIds.some(id=>value(answers,id)===2))addTag('T002','只记录最近那一次联机的疲倦、退出意愿和参与状态，不代表固定性格。');
  if(value(answers,'T003A')===0)addTag('T003','仅限这次回想的游戏和操作，不代表学习能力或合作态度。');
  if(value(answers,'T004A')!==null&&value(answers,'T004A')>=3)addTag('T004','本次自述的注意习惯，不作医学或心理判断。');
  return {version,code:highlights[0]?.code??null,primaryIds:highlights.map(item=>item.code),ranked,labels:labelResults,evaluated,answered:plan.length,notApplicable:plan.filter(id=>value(answers,id)===null).length,insufficient:highlights.length===0};
}
return {version,types,tags,questions,byId,initial,extras,rules,has,value,buildPlan,calculate};
