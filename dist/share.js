'use strict';
window.GameShare=(()=>{
 const fallback='https://gamebti.app.workbuddy.host/?sharecode=UVPWTOVNVN',cache=new Map();
 function home(){const base=new URL(document.querySelector('meta[name="gamebti-share-url"]')?.content||fallback);base.hash='';return base.href;}
 function invitation(){return '来测测你是哪种玩家，看看咱俩像不像！\n'+home();}
 function url(code){return window.GameCollection.giftURL(home(),code,window.GameData.types);}
 function image(code){const text=url(code);if(!cache.has(text)){const qr=qrcodegen.QrCode.encodeText(text,qrcodegen.QrCode.Ecc.MEDIUM),n=qr.size+8;let path='';for(let row=0;row<qr.size;row++)for(let col=0;col<qr.size;col++)if(qr.getModule(col,row))path+=`M${col+4} ${row+4}h1v1h-1z`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n*5}" height="${n*5}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><path fill="white" d="M0 0h${n}v${n}H0z"/><path fill="black" d="${path}"/></svg>`;cache.set(text,'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));}return cache.get(text);}
 function draw(ctx,code,x,y,side){window.GameCardQR.draw(ctx,url(code),x,y,side);}
 return {url,image,draw,home,invitation};
})();
