/* QR encoder: qrcode-generator 2.0.4, Kazuhiko Arase, MIT (see vendor/qrcode.js). */
'use strict';
window.GameShare=(()=>{
 const publicURL='https://gamebti.app.workbuddy.host/?sharecode=UVPWTOVNVN';
 const cache=new Map();
 function url(code){return window.GameCollection.giftURL(publicURL,code,window.GameData.types);}
 function matrix(code){if(!cache.has(code)){const qr=qrcode(0,'M');qr.addData(url(code));qr.make();cache.set(code,qr);}return cache.get(code);}
 function image(code){return matrix(code).createDataURL(5,20);}
 function draw(ctx,code,x,y,size){const qr=matrix(code),n=qr.getModuleCount(),cell=Math.floor(size/(n+8)),side=cell*(n+8),left=x+Math.floor((size-side)/2),top=y+Math.floor((size-side)/2);ctx.fillStyle='#fff';ctx.fillRect(x,y,size,size);ctx.fillStyle='#000';for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))ctx.fillRect(left+(c+4)*cell,top+(r+4)*cell,cell,cell);}
 return {url,image,draw};
})();
