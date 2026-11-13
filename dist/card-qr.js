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
  function frame(ctx,x,y,side){
    const pad=10,left=x-pad,top=y-pad,width=side+pad*2,radius=12;
    function outline(offset){ctx.beginPath();ctx.moveTo(left+radius,top+offset);ctx.lineTo(left+width-radius,top+offset);ctx.quadraticCurveTo(left+width,top+offset,left+width,top+radius+offset);ctx.lineTo(left+width,top+width-radius+offset);ctx.quadraticCurveTo(left+width,top+width+offset,left+width-radius,top+width+offset);ctx.lineTo(left+radius,top+width+offset);ctx.quadraticCurveTo(left,top+width+offset,left,top+width-radius+offset);ctx.lineTo(left,top+radius+offset);ctx.quadraticCurveTo(left,top+offset,left+radius,top+offset);ctx.closePath();}
    ctx.save();outline(5);ctx.fillStyle='#101613';ctx.fill();outline(0);ctx.fillStyle='#f5f1e7';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle='#b9a580';ctx.stroke();ctx.restore();
  }
  return {draw,frame};
})();
