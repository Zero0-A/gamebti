'use strict';
window.GameRounds = (() => {
  const version='gamebti-rounds-v2',size=12,minRounds=3;
  const pairs=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]];
  const groups=window.RoundContent.map(group=>({...group,questions:group.questions.map((row,i)=>{
    const axes=pairs[i%pairs.length];
    const options=row.slice(1).map(([label,first,second])=>({label,values:[first,second]}));
    // 轮换选项位置，避免同一位置总代表同一方向。
    return {id:`${group.id}-${i+1}`,title:row[0],axes,options:options.slice(i%4).concat(options.slice(0,i%4))};
  })}));
  const byId=Object.fromEntries(groups.map(group=>[group.id,group]));
  function shuffle(values){const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
  function createRound(groupId){
    const g=byId[groupId];
    // 六种方向组合各抽两题，避免随机抽题后某个方向缺少依据。
    const questionOrder=shuffle(pairs.flatMap((_,pair)=>shuffle(g.questions.map((q,i)=>i).filter(i=>i%pairs.length===pair)).slice(0,2)));
    return {groupId,questionOrder,optionOrders:questionOrder.map(()=>shuffle([0,1,2,3])),answers:[],index:0};
  }
  function create(){const order=shuffle(groups.map(g=>g.id));return {version,order,rounds:[createRound(order[0])],stage:'quiz'};}
  function active(state){return state.rounds[state.rounds.length-1];}
  function group(state){return byId[active(state).groupId];}
  function questions(round){
    const g=byId[round.groupId];
    // 旧进度没有排序记录，仍按原来的十二题和选项顺序恢复。
    return (round.questionOrder||Array.from({length:size},(_,i)=>i)).map((id,i)=>{
      const q=g.questions[id];return {...q,options:round.optionOrders?round.optionOrders[i].map(j=>q.options[j]):q.options};
    });
  }
  function question(state){return questions(active(state))[active(state).index];}
  function score(round,excluded=[]){
    const g=byId[round.groupId];
    if(!g||round.answers.length!==size||round.answers.some(a=>!Number.isInteger(a)||a<0||a>3))throw Error('本轮需要完成12题');
    const totals=[0,0,0,0],counts=[0,0,0,0];
    const evidence=questions(round).map((q,i)=>{const choice=q.options[round.answers[i]];q.axes.forEach((axis,j)=>{totals[axis]+=choice.values[j];counts[axis]++;});return {question:q.title,answer:choice.label,axes:q.axes,values:choice.values};});
    const vector=totals.map((v,i)=>v/counts[i]);
    const ranked=Object.entries(g.profiles).filter(([code])=>!excluded.includes(code)).map(([code,profile])=>({
      code,distance:profile.reduce((sum,v,i)=>sum+(v-vector[i])**2,0)/4,
      detail:evidence.reduce((sum,e)=>sum+e.axes.reduce((s,axis,j)=>s+(profile[axis]-e.values[j])**2,0),0)
    })).sort((a,b)=>a.distance-b.distance||a.detail-b.detail||a.code.localeCompare(b.code));
    if(!ranked.length)throw Error('本组没有未获得的人格');
    const winner=ranked[0],runner=ranked[1];
    return {code:winner.code,groupId:g.id,groupName:g.name,vector,ranked,evidence,
      close:!!runner&&runner.distance-winner.distance<0.35,
      weak:winner.distance>2, tied:!!runner&&Math.abs(runner.distance-winner.distance)<1e-9};
  }
  function results(state){const found=[];for(const round of state.rounds){if(round.answers.length===size)found.push(score(round,found.map(r=>r.code)));}return found;}
  function answer(state,index){
    if(state.stage!=='quiz'||!Number.isInteger(index)||index<0||index>3)throw Error('当前不能作答');
    const round=active(state);
    // 返回修改只影响本轮尚未发卡的答案，已经获得的人格不回滚。
    round.answers=round.answers.slice(0,round.index);round.answers.push(index);
    if(round.answers.length===size){round.index=size-1;state.stage='result';}
    else round.index=round.answers.length;
  }
  function previous(state){const round=active(state);if(state.stage==='quiz'&&round.index>0)round.index--;}
  function canContinue(state){return state.stage==='result'&&state.rounds.length<state.order.length;}
  function proceed(state){if(!canContinue(state))throw Error('没有下一轮');state.rounds.push(createRound(state.order[state.rounds.length]));state.stage='quiz';}
  function finish(state){if(state.stage!=='result'||state.rounds.length<minRounds)throw Error('先获得三个人格再结束');state.stage='ended';}
  function restore(raw){
    try{
      if(!raw||raw.version!==version||!Array.isArray(raw.order)||raw.order.length!==groups.length||new Set(raw.order).size!==groups.length||raw.order.some(id=>!Object.hasOwn(byId,id)))return null;
      if(!Array.isArray(raw.rounds)||raw.rounds.length<1||raw.rounds.length>groups.length||!['quiz','result','ended'].includes(raw.stage))return null;
      const rounds=[];
      for(let i=0;i<raw.rounds.length;i++){
        const r=raw.rounds[i],last=i===raw.rounds.length-1;
        if(!r||r.groupId!==raw.order[i]||!Array.isArray(r.answers)||r.answers.length>size||Array.from(r.answers).some(a=>!Number.isInteger(a)||a<0||a>3)||!Number.isInteger(r.index)||r.index<0||r.index>=size)return null;
        if(!last||raw.stage!=='quiz'){if(r.answers.length!==size||r.index!==size-1)return null;}
        else if(r.answers.length===size||r.index>r.answers.length)return null;
        const round={groupId:r.groupId,answers:[...r.answers],index:r.index};
        if(r.questionOrder!==undefined||r.optionOrders!==undefined){
          if(!Array.isArray(r.questionOrder)||r.questionOrder.length!==size||new Set(r.questionOrder).size!==size||r.questionOrder.some(id=>!Number.isInteger(id)||id<0||id>=byId[r.groupId].questions.length))return null;
          if(pairs.some((_,pair)=>r.questionOrder.filter(id=>id%pairs.length===pair).length!==2))return null;
          if(!Array.isArray(r.optionOrders)||r.optionOrders.length!==size||r.optionOrders.some(order=>!Array.isArray(order)||order.length!==4||new Set(order).size!==4||order.some(j=>!Number.isInteger(j)||j<0||j>3)))return null;
          round.questionOrder=[...r.questionOrder];round.optionOrders=r.optionOrders.map(order=>[...order]);
        }
        rounds.push(round);
      }
      if(raw.stage==='ended'&&rounds.length<minRounds)return null;
      const state={version,order:[...raw.order],rounds,stage:raw.stage};results(state);return state;
    }catch{return null;}
  }
  return {version,size,minRounds,groups,byId,create,active,group,question,score,results,answer,previous,canContinue,proceed,finish,restore};
})();
