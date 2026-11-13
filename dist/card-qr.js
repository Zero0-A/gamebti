'use strict';
window.GameCardQR=(()=>{
  function draw(ctx,text,x,y,side){
    const qr=qrcodegen.QrCode.encodeText(text,qrcodegen.QrCode.Ecc.MEDIUM);
    // 四模块白边和整数像素格，避免导出时裁边或出现灰色接缝。
    const border=4,cells=qr.size+border*2,scale=Math.floor(side/cells);
    if(scale<2)throw Error('QR code area too small');
    const left=x+Math.floor((side-cells*scale)/2),top=y+Math.floor((side-cells*scale)/2);
    ctx.save();
    ctx.fillStyle='#ffffff';ctx.fillRect(x,y,side,side);
    ctx.fillStyle='#000000';
    for(let row=0;row<qr.size;row++)for(let col=0;col<qr.size;col++){
      if(qr.getModule(col,row))ctx.fillRect(left+(col+border)*scale,top+(row+border)*scale,scale,scale);
    }
    ctx.restore();
  }
  return {draw};
})();
