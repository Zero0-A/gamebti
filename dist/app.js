'use strict';
(() => {
  const {types}=window.GameData, rounds=window.GameRounds;
  const $=s=>document.querySelector(s);
  const totalTypes=Object.keys(types).length,saveKey='gamebti-rounds-save-v2';
  let book=window.GameCollection.create(types,()=>localStorage);
  let session=null,result=null,screen='home',filter='unlocked',pendingGift=null,toastTimer,answerTimer=null;
  const mobile=matchMedia('(max-width:640px)');
  const sceneNames={team:'团队协作',relations:'朋友相处',discovery:'探索发现',building:'经营建造',challenge:'挑战难关',pace:'游玩节奏'};
  const whaleMark='<img class="whale-mark" src="assets/whale-mark.svg" width="24" height="18" alt="">';
  const lockIcon='<svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M10 20v-8a10 10 0 0 1 20 0v8" stroke="currentColor" stroke-width="3"/><rect x="3" y="20" width="34" height="25" rx="5" stroke="currentColor" stroke-width="3"/><path d="M20 29v7" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  function artworkURL(code){return `assets/characters/${code}.webp`;}
  function character(code,className='card-icon'){const eager=/identity-character|whale-main|whale-companion|gift-character/.test(className);return `<img class="whale-sprite ${className}" src="${artworkURL(code)}" width="1254" height="1254" alt="" aria-hidden="true" decoding="async" loading="${eager?'eager':'lazy'}">`;}
  $('#whale-cast').innerHTML=character('G039','whale-companion whale-left')+character('G031','whale-main')+character('G042','whale-companion whale-right');
  function notify(text){let toast=$('#toast');if(!toast){toast=document.createElement('div');toast.id='toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast);}clearTimeout(toastTimer);if(toast.showPopover){toast.hidePopover();toast.showPopover();}else{const dialogs=document.querySelectorAll('dialog[open]');(dialogs[dialogs.length-1]||document.body).append(toast);}toast.textContent=text;toast.classList.add('visible');toastTimer=setTimeout(()=>{toast.classList.remove('visible');toast.hidePopover?.();},4200);}
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());}
  function openDialog(d){d.showModal();document.body.classList.add('dialog-open');d.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))document.body.classList.remove('dialog-open');},{once:true});}
  function showScreen(next){clearTimeout(answerTimer);answerTimer=null;screen=next;document.body.dataset.screen=next;['home','quiz','result'].forEach(id=>$('#'+id).hidden=id!==next);scrollTo({top:0,behavior:'instant'});$('#main').focus({preventScroll:true});if(next==='home')updateResume();}
  function save(){try{localStorage.setItem(saveKey,JSON.stringify(session));}catch{notify('进度没能保存下来，你可以继续答，但关掉页面后可能需要重新开始。');}}
  function readSave(){try{return rounds.restore(JSON.parse(localStorage.getItem(saveKey)));}catch{return null;}}
  function updateResume(){const s=readSave(),button=$('#resume-button');button.hidden=false;button.disabled=!s;}
  function start(){
    const old=readSave();if(old&&old.stage!=='ended'&&!confirm('开始新的一局？当前这局进度会被替换，已解锁的图鉴会保留。'))return;
    closeDialogs();session=rounds.create();result=null;save();renderQuiz();showScreen('quiz');
  }
  function runTray(codes,interactive=false){
    const slots=Array.from({length:Math.max(3,codes.length+(interactive?0:1))},(_,i)=>{
      const code=codes[i],active=interactive&&code===result.code;
      const avatar=code?character(code,'run-avatar'):'';
      const content=code?`${interactive?`<span class="run-portrait">${avatar}</span>`:avatar}<span><small>第 ${i+1} 轮</small><b>${types[code].name}</b></span>`:`<span class="run-empty mono" aria-hidden="true">?</span><span><small>第 ${i+1} 轮</small><b>${!interactive&&i===session.rounds.length-1?'探索中':'待解锁'}</b></span>`;
      return code&&interactive?`<button class="run-slot card-${types[code].group}${active?' active':''}" data-result-type="${code}" aria-pressed="${active}">${content}</button>`:`<div class="run-slot${code?' earned card-'+types[code].group:(!interactive&&i===session.rounds.length-1?' current':'')}">${content}</div>`;
    });
    return `<div class="run-tray${interactive?' result-type-picker':''}" aria-label="本局人格卡">${slots.join('')}</div>`;
  }
  function renderQuiz(){
    const r=rounds.active(session),g=rounds.group(session),q=rounds.question(session),selected=r.answers[r.index];
    $('#quiz').innerHTML=`<div class="quiz-toolbar"><button class="back-link" data-action="home">← 回大厅</button><span class="quiz-phase">第 ${session.rounds.length} 轮 <b class="mono">${r.index+1} / 12</b></span></div><div class="progress-track" role="progressbar" aria-label="本轮答题进度" aria-valuemin="0" aria-valuemax="12" aria-valuenow="${r.index}"><div class="progress-fill" style="width:${r.index/12*100}%"></div></div><div class="quiz-layout"><aside class="quiz-sidebar"><div class="quiz-round-art" aria-hidden="true"><span>ROUND</span><b>${String(session.rounds.length).padStart(2,'0')}</b>${whaleMark}</div>${runTray(rounds.results(session).map(item=>item.code))}</aside><div class="quiz-main"><div class="quiz-question" data-theme="${g.id}"><div class="question-heading"><span class="question-number mono" aria-hidden="true">${String(r.index+1).padStart(2,'0')}</span><span class="question-scene">${sceneNames[g.id]}</span><h2 class="question-title" id="question-title" tabindex="-1">${q.title}</h2></div><div class="answers round-answers ${q.options.every(option=>option.label.length<=30)?'answers-short':''}" role="group" aria-labelledby="question-title">${q.options.map((option,index)=>`<button class="answer ${selected===index?'selected':''}" data-answer="${index}" aria-pressed="${selected===index}"><span class="answer-key">${index+1}</span><span>${option.label}</span><span class="answer-indicator" aria-hidden="true">↗</span></button>`).join('')}</div></div><div class="quiz-bottom"><button class="quiz-prev" data-action="previous" ${r.index===0?'disabled':''}>← 上一题</button></div></div></div>`;
  }
  function refreshResult(){const found=rounds.results(session);result={code:found.at(-1)?.code,primaryIds:found.map(r=>r.code),ranked:found};}
  function chooseAnswer(index){
    if(answerTimer!==null||screen!=='quiz'||session?.stage!=='quiz')return;
    document.querySelectorAll('#quiz button').forEach(b=>b.disabled=true);
    const button=$(`[data-answer="${index}"]`);button.classList.add('selected');button.setAttribute('aria-pressed','true');
    rounds.answer(session,index);save();
    // 给选中状态留一点反馈时间，同时挡住连点穿透到下一题。
    answerTimer=setTimeout(()=>{answerTimer=null;if(session.stage==='result'){refreshResult();unlock(result.code,'self');renderResult(true);showScreen('result');}else{renderQuiz();scrollTo(0,0);$('#question-title').focus({preventScroll:true});}},180);
  }
  function continueRound(){if(!session||!rounds.canContinue(session))return;rounds.proceed(session);result=null;save();renderQuiz();showScreen('quiz');}
  function finishRun(){if(!session)return;rounds.finish(session);save();renderResult();showScreen('result');}
  function renderResult(reveal=false){
    if(session.stage==='ended'){
      $('#result').innerHTML=`<div class="completion-page"><div class="result-heading"><span class="completion-mark mono" aria-hidden="true">✓</span><span class="section-kicker mono">COLLECTION COMPLETE</span><h2>本局完成</h2><p>获得 ${result.primaryIds.length} 张人格卡</p></div><div class="completion-grid">${result.primaryIds.map(code=>{const t=types[code];return `<button class="completion-card card-${t.group}" data-type="${code}" aria-label="查看 ${t.name}"><span class="mono">${code}</span>${character(code,'completion-character')}<h3>${t.name}</h3><p>${t.trait}</p><span class="completion-view">查看人格 →</span></button>`;}).join('')}</div><div class="completion-actions"><button class="button button-dark" data-action="home">回大厅 →</button><button class="button button-outline" data-action="start">再开一局 ↻</button></div></div>`;
      return;
    }
    const t=types[result.code];
    const count=result.primaryIds.length,more=rounds.canContinue(session);
    const heading=`第 ${count} 轮结果`;
    const flow=`${more?`<button class="button ${count<3?'button-dark':'button-outline'}" data-action="continue">继续下一轮 →</button>`:''}${count>=3?`<button class="button button-dark" data-action="finish">完成本局 ✓</button>`:''}`;
    $('#result').innerHTML=`<div class="result-heading"><span class="section-kicker mono">PLAYER UNLOCKED</span><h2>${heading}</h2><p>已收集 ${count} 张${count<3?` · 再完成 ${3-count} 轮可结束`:''}</p></div>
      <div class="result-layout"><div class="result-showcase"><div class="identity-card card-${t.group}${reveal?' is-revealed':''}" id="identity-card"><div class="identity-code">${result.code}</div><div class="identity-name"><span class="identity-en">${t.category}</span><h3>${t.name}</h3></div>${character(result.code,'identity-character')}<p class="identity-quote">“${t.quote}”</p>${qrBlock(result.code)}</div>${runTray(result.primaryIds,true)}</div>
      <div class="result-detail"><div class="result-copy"><h3>${t.trait}</h3><p class="result-intro">${t.intro}</p><div class="result-habits"><h3>典型表现</h3><p>${t.example}</p></div></div><div class="round-flow">${flow}</div><div class="result-actions"><button class="button button-outline" data-action="download">保存图片 ↓</button><button class="button button-outline" data-action="share">分享 ↗</button><button class="text-link" data-action="collection">我的图鉴 →</button></div></div></div>`;
  }

  function lockedCard(n){return `<div class="player-card card-locked" aria-label="第 ${n} 格，未解锁"><div class="card-top"><span class="card-code">???</span><span class="card-number">NO.${String(n).padStart(2,'0')}</span></div><div class="locked-glyph">${lockIcon}</div><h3>尚未遇见</h3></div>`;}
  function card(code){const index=Object.keys(types).indexOf(code),t=types[code],source=book.source(code);if(!book.has(code))return lockedCard(index+1);return `<button class="player-card card-${t.group}" data-type="${code}" aria-label="了解 ${code} ${t.name}"><div class="card-top"><span class="card-code">${code}</span><span class="card-number">NO.${String(index+1).padStart(2,'0')}</span></div><div class="card-body"><div><h3>${t.name}</h3><span class="card-sub">${t.category}</span></div>${character(code)}</div><p class="card-quote">“${t.quote}”</p><span class="card-source">${source.self?(source.friend?'自己测出 · 也收到过':'自己测出的'):'朋友送来的'}</span><span class="card-arrow">↗</span></button>`;}
  function emptyCollection(){return `<div class="collection-empty"><div class="empty-lock">${lockIcon}</div><h3>${filter==='friend'?'还没收到搭子的人格卡':'还没有人格卡'}</h3><p>${filter==='friend'?'朋友给你发来人格链接后，点开就能把那张卡收进图鉴。':'你测出的人格会收在这里，朋友分享给你的卡片也能一起收藏。'}</p>${filter==='friend'?'':'<button class="button button-dark" data-action="start">开始测试 <span>↗</span></button>'}</div>`;}
  function renderCollection(){const codes=Object.keys(types).filter(code=>filter==='all'||(filter==='unlocked'?book.has(code):book.source(code)[filter]));$('#collection-grid').innerHTML=codes.length?codes.map(card).join(''):emptyCollection();const unlocked=book.codes();$('#collection-count').textContent=unlocked.length+'/'+totalTypes;$('#collection-progress-fill').style.width=unlocked.length/totalTypes*100+'%';$('#collection-filters').querySelectorAll('button').forEach(button=>{const kind=button.dataset.filter;button.classList.toggle('active',kind===filter);button.querySelector('span').textContent=kind==='all'?totalTypes:kind==='unlocked'?unlocked.length:unlocked.filter(code=>book.source(code)[kind]).length;});}
  function refreshCollection(){const codes=book.codes();$('#nav-unlocked').textContent=codes.length+'/'+totalTypes;$('#featured-players').innerHTML=codes.length?codes.slice(-4).map(card).join(''):emptyCollection();if($('#collection-dialog').open)renderCollection();}
  function unlock(code,source){const state=book.unlock(code,source);refreshCollection();if(!state.persisted)notify('这张卡已经解锁了，不过浏览器没能保存，关掉页面后可能会丢失。');return state;}
  function openCollection(code){closeDialogs();filter='unlocked';renderCollection();openDialog($('#collection-dialog'));if(code)previewType(code);}
  function previewType(code){if(!book.has(code))return;const t=types[code];$('#collection-grid .type-preview-detail')?.remove();$('#collection-grid').querySelectorAll('.player-card').forEach(card=>card.classList.toggle('selected',card.dataset.type===code));const detail=document.createElement('div');detail.className='type-preview-detail';detail.innerHTML=`<h3>${code} · ${t.name}</h3><p>${t.intro}</p><h4>典型表现</h4><p>${t.example}</p>${qrBlock(code)}<div class="result-actions"><button class="button button-outline" data-action="download" data-card-code="${code}">保存图片 ↓</button><button class="button button-outline" data-action="share" data-card-code="${code}">分享 ↗</button></div>`;const selected=$(`#collection-grid [data-type="${code}"]`),cards=[...$('#collection-grid').querySelectorAll('.player-card')],columns=Math.max(1,Math.round($('#collection-grid').clientWidth/(selected.offsetWidth+12))),index=cards.indexOf(selected),end=Math.min(Math.floor(index/columns)*columns+columns-1,cards.length-1);cards[end].after(detail);detail.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'nearest'});}
  function clearGiftHash(){const url=new URL(location.href),params=new URLSearchParams(url.hash.slice(1));if(params.has('meet')){params.delete('meet');url.hash=params.toString();history.replaceState(history.state,'',url);}}
  async function handleGift(){
    const params=new URLSearchParams(location.hash.slice(1));if(!params.has('meet'))return;
    const code=window.GameCollection.parseGift(location.hash,types);if(!code){clearGiftHash();notify('链接无效，请朋友重新分享。');return;}
    closeDialogs();pendingGift=code;const t=types[code],known=book.has(code);
    $('#gift-content').innerHTML=`<p class="gift-eyebrow">${known?'这张卡你已经收过了，可以去图鉴里再看看。':'朋友给你发来了一张人格卡。'}</p><p class="gift-loading" role="status">正在加载人格卡…</p><img class="card-preview-image gift-poster" alt="${code} ${t.name} 人格卡：${t.category}，${t.trait}。${t.quote}" hidden><button class="button button-dark" data-action="claim-gift">${known?'查看图鉴':'收藏人格'} <span>↓</span></button><button class="text-link" data-action="start">我也测一测 →</button>`;
    const image=$('#gift-content .gift-poster'),status=$('#gift-content .gift-loading');openDialog($('#gift-dialog'));
    try{const canvas=await createPersonalityCard(code);if(!image.isConnected||pendingGift!==code)return;image.src=canvas.toDataURL('image/png');image.hidden=false;status.remove();}
    catch{if(image.isConnected)status.textContent='人格卡暂时没能加载，请重新打开链接。';}
  }
  function claimGift(){if(!pendingGift)return;const code=pendingGift,{added}=unlock(code,'friend');$('#gift-dialog').close();clearGiftHash();pendingGift=null;openCollection(code);notify(added?'已收藏':'已在图鉴中');}
  function shareSite(){const d=$('#site-share-dialog');d.querySelector('textarea').hidden=true;d.querySelector('.site-share-status').textContent='';if(!d.open)openDialog(d);}
  async function copySite(){
    const d=$('#site-share-dialog'),field=d.querySelector('textarea'),status=d.querySelector('.site-share-status');field.value=window.GameShare.invitation();
    try{if(!navigator.clipboard||!isSecureContext)throw Error('manual');await navigator.clipboard.writeText(field.value);field.hidden=true;status.textContent='复制成功，发给搭子吧。';notify('复制成功');}
    catch{const focused=document.activeElement;field.hidden=false;field.focus();field.select();let copied=false;try{copied=!!document.execCommand?.('copy');}catch{}
      if(copied){field.hidden=true;status.textContent='复制成功，发给搭子吧。';notify('复制成功');focused?.focus?.({preventScroll:true});}
      else status.textContent='长按下方文字，复制后发给搭子。';
    }
  }
  function resultLink(code){return window.GameShare.url(code);}
  function qrBlock(code){return `<div class="card-qr"><img src="${window.GameShare.image(code)}" width="112" height="112" alt="扫码收藏${types[code].name}"><span>扫码收下这张人格卡<small>gamebti.app.workbuddy.host</small></span></div>`;}
  async function share(code=result?.code,button){if(!book.has(code))return;await download(code,button,true);}
  async function copyLink(code){if(!book.has(code))return;const text=`GameBTI · ${types[code].name}\n${resultLink(code)}`;try{if(!navigator.clipboard||!isSecureContext)throw Error('manual');await navigator.clipboard.writeText(text);notify('分享链接已复制');}catch{showCopyDialog(text);}}
  function showCopyDialog(text){let d=$('#share-dialog');if(!d){d=document.createElement('dialog');d.id='share-dialog';d.className='about-dialog';document.body.append(d);}d.innerHTML='<button class="close-button" data-action="close" aria-label="关闭分享">×</button><h2>分享人格</h2><textarea aria-label="人格分享内容" class="share-copy" readonly></textarea><button class="button button-dark" data-action="copy-share">复制分享内容 ↓</button>';d.querySelector('textarea').value=text;openDialog(d);}
  async function copyShare(button){
    const field=$('#share-dialog').querySelector('textarea');button.disabled=true;
    try{
      let copied=false;
      if(isSecureContext&&navigator.clipboard){try{await navigator.clipboard.writeText(field.value);copied=true;}catch{}}
      if(!copied){field.focus();field.select();try{copied=!!document.execCommand?.('copy');}catch{}}
      if(copied)button.textContent='已复制 ✓';else{button.textContent='复制分享内容 ↓';notify('没能自动复制，文字已经帮你选好了，可以长按或按 Ctrl+C 复制。');}
    }finally{button.disabled=false;}
  }
  function previewCard(blob,code){let d=$('#card-preview-dialog');if(!d){d=document.createElement('dialog');d.id='card-preview-dialog';d.className='card-preview-dialog';document.body.append(d);}const t=types[code],url=URL.createObjectURL(blob),filename=`GameBTI-${code}-${t.name}.png`;d.innerHTML=`<div class="dialog-top"><h2>分享人格卡</h2><button class="close-button" data-action="close" aria-label="关闭人格卡预览">×</button></div><img class="card-preview-image" alt="${code} ${t.name} 人格卡"><p>保存或发给朋友，扫码就能收下这张卡。</p><div class="card-preview-actions"><a class="button button-dark" download>保存图片 ↓</a><button class="button button-outline" hidden>分享图片 ↗</button></div><button class="text-link card-preview-link" data-action="copy-link" data-card-code="${code}">复制分享链接 →</button>`;d.querySelector('img').src=url;const link=d.querySelector('a');link.href=url;link.download=filename;const file=new File([blob],filename,{type:'image/png'}),button=d.querySelector('.button-outline');if(navigator.canShare?.({files:[file]})){button.hidden=false;button.addEventListener('click',async()=>{try{await navigator.share({files:[file],title:`GameBTI · ${t.name}`,text:resultLink(code)});}catch(error){if(error.name!=='AbortError')notify('可以长按图片保存，再把人格链接发给朋友。');}});}d.addEventListener('close',()=>URL.revokeObjectURL(url),{once:true});document.body.append($('#toast'));if(d.open)d.close();openDialog(d);}
  const cardPalette={background:'#172139',ink:'#f2f5ff',accent:'#8fdbff',muted:'#afbcd3',line:'#afc4eb35'};
  // 双倍像素导出，排版坐标仍按900×1260绘制，让文字和边框保持清晰。
  let makingCard=false;
  async function createPersonalityCard(code){
    const t=types[code];if(document.fonts?.ready)await document.fonts.ready;const canvas=document.createElement('canvas');canvas.width=1800;canvas.height=2520;const ctx=canvas.getContext('2d');ctx.scale(2,2);ctx.fillStyle=cardPalette.background;ctx.fillRect(0,0,900,1260);ctx.fillStyle=cardPalette.ink;ctx.font='bold 35px Arial';ctx.fillText('gamebti',65,90);const mark=new Image();mark.src='assets/whale-mark.svg';await mark.decode();ctx.drawImage(mark,213,59,43,34);ctx.textAlign='right';ctx.font='18px monospace';ctx.fillText('PLAYER ID CARD',835,86);ctx.strokeStyle=cardPalette.line;ctx.beginPath();ctx.moveTo(65,120);ctx.lineTo(835,120);ctx.stroke();ctx.textAlign='center';ctx.fillStyle=cardPalette.accent;ctx.font='bold 94px Arial';ctx.fillText(code,450,265);ctx.fillStyle=cardPalette.ink;ctx.font='bold 56px "Microsoft YaHei",sans-serif';ctx.fillText(t.name,450,350);ctx.font='22px "Microsoft YaHei",sans-serif';ctx.fillText(t.category,450,403);const image=new Image();image.crossOrigin="anonymous";image.src=artworkURL(code);await image.decode();ctx.imageSmoothingEnabled=false;ctx.drawImage(image,220,420,460,460);ctx.font='28px "Microsoft YaHei",sans-serif';ctx.fillText('“'+t.quote+'”',450,918);ctx.fillStyle=cardPalette.muted;ctx.font='24px "Microsoft YaHei",sans-serif';ctx.fillText(t.trait,450,982);ctx.strokeStyle=cardPalette.line;ctx.beginPath();ctx.moveTo(65,1025);ctx.lineTo(835,1025);ctx.stroke();ctx.textAlign='left';ctx.fillStyle=cardPalette.ink;ctx.font='bold 28px "Microsoft YaHei",sans-serif';ctx.fillText('溯游工作室',65,1090);ctx.font='22px "Microsoft YaHei",sans-serif';ctx.fillText('GameBTI · 玩家人格卡',65,1130);ctx.fillStyle=cardPalette.accent;ctx.font='21px "Microsoft YaHei",sans-serif';ctx.fillText('扫码收藏这张人格卡',65,1175);ctx.fillStyle=cardPalette.muted;ctx.font='17px "Microsoft YaHei",sans-serif';ctx.fillText('仅供娱乐',65,1210);window.GameCardQR.frame(ctx,655,1040,180);window.GameCardQR.draw(ctx,resultLink(code),655,1040,180);return canvas;
  }
  async function download(code,button,preview=false){
    if(!book.has(code)||makingCard)return;makingCard=true;const t=types[code],label=button.innerHTML;button.disabled=true;button.textContent='正在生成…';
    try{const canvas=await createPersonalityCard(code);const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(Error('empty')),'image/png'));if(preview||mobile.matches)previewCard(blob,code);else{const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`GameBTI-${code}-${t.name}.png`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);notify('人格卡已经生成了，可以在浏览器的下载列表里找到。');}}catch{notify('图片生成没成功，可以先分享人格链接。');}finally{makingCard=false;button.disabled=false;button.innerHTML=label;}
  }
  document.addEventListener('click',event=>{const b=event.target.closest('button');if(!b||b.disabled)return;if(b.dataset.answer!==undefined){chooseAnswer(Number(b.dataset.answer));return;}if(b.dataset.resultType){if(result?.primaryIds.includes(b.dataset.resultType)){result.code=b.dataset.resultType;renderResult();$('[data-result-type="'+result.code+'"]').focus({preventScroll:true});}return;}if(b.dataset.filter){filter=b.dataset.filter;renderCollection();return;}if(b.dataset.type){if(!$('#collection-dialog').open)openCollection(b.dataset.type);else previewType(b.dataset.type);return;}switch(b.dataset.action){case'start':start();break;case'share-site':shareSite();break;case'copy-site':copySite();break;case'continue':continueRound();break;case'finish':finishRun();break;case'previous':rounds.previous(session);save();renderQuiz();scrollTo(0,0);$('#question-title').focus({preventScroll:true});break;case'home':showScreen('home');break;case'collection':openCollection();break;case'about':openDialog($('#about-dialog'));break;case'rules':openDialog($('#rules-dialog'));break;case'close':b.closest('dialog').close();break;case'claim-gift':claimGift();break;case'share':share(b.dataset.cardCode||b.dataset.shareCode||result?.code,b);break;case'copy-link':copyLink(b.dataset.cardCode||b.dataset.shareCode);break;case'copy-share':copyShare(b);break;case'download':download(b.dataset.cardCode||result?.code,b);break;}});
  document.querySelectorAll('.brand,.footer-brand').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();showScreen('home');}));
  $('#resume-button').addEventListener('click',()=>{const s=readSave();if(!s){updateResume();return;}session=s;if(s.stage==='quiz'){result=null;renderQuiz();showScreen('quiz');}else{refreshResult();result.primaryIds.forEach(code=>unlock(code,'self'));renderResult();showScreen('result');}});
  document.addEventListener('keydown',event=>{if(screen!=='quiz'||answerTimer!==null||document.querySelector('dialog[open]')||event.altKey||event.ctrlKey||event.metaKey||event.repeat)return;const index=Number(event.key)-1;if(Number.isInteger(index)&&index>=0&&index<4){event.preventDefault();document.querySelector(`[data-answer="${index}"]`)?.click();}});
  document.addEventListener('click',event=>{if(event.target.tagName==='DIALOG'){const box=event.target.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)event.target.close();}});
  $('#gift-dialog').addEventListener('close',()=>{if(!$('#gift-dialog').open){pendingGift=null;clearGiftHash();}});
  addEventListener('storage',event=>{if(event.key==='gamebti-collection-v2'){book=window.GameCollection.create(types,()=>localStorage);refreshCollection();}});
  const saved=readSave();if(saved){rounds.results(saved).forEach(({code})=>{if(!book.source(code).self)book.unlock(code,'self');});}
  refreshCollection();updateResume();handleGift();addEventListener('hashchange',handleGift);
})();
