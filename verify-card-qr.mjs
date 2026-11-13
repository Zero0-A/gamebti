import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const context={window:{},URL,URLSearchParams};
vm.createContext(context);
for(const file of ['data.js','collection.js','vendor/qrcodegen.js','card-qr.js']){
  vm.runInContext(readFileSync(new URL('./dist/'+file,import.meta.url),'utf8'),context);
}
const html=readFileSync(new URL('./dist/index.html',import.meta.url),'utf8');
const base=html.match(/<meta name="gamebti-share-url" content="([^"]+)">/)[1];
const address=new URL(base);
assert.equal(address.protocol,'https:');
assert.equal(address.hostname,'gamebti.app.workbuddy.host');
assert.equal(address.searchParams.get('sharecode'),'UVPWTOVNVN');
const patterns=new Set();
for(const code of Object.keys(context.window.GameData.types)){
  const url=context.window.GameCollection.giftURL(base,code,context.window.GameData.types);
  assert.equal(new URL(url).search,address.search,'Keep the public hosting sharecode');
  assert.equal(context.window.GameCollection.parseGift(new URL(url).hash,context.window.GameData.types),code);
  const rects=[],ctx={save(){},restore(){},fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle});}};
  context.window.GameCardQR.draw(ctx,url,655,1040,180);
  assert.deepEqual(rects[0],{x:655,y:1040,w:180,h:180,color:'#ffffff'});
  const modules=rects.slice(1),scale=modules[0].w;
  assert.ok(scale>=2&&Number.isInteger(scale));
  assert.ok(modules.length>100);
  for(const m of modules){
    assert.equal(m.color,'#000000');assert.equal(m.w,scale);assert.equal(m.h,scale);
    assert.ok([m.x,m.y,m.w,m.h].every(Number.isInteger),'No fractional module pixels');
    assert.ok(m.x>=655+4*scale&&m.y>=1040+4*scale,'Keep the top/left quiet zone');
    assert.ok(m.x+m.w<=835-4*scale&&m.y+m.h<=1220-4*scale,'Keep the bottom/right quiet zone');
  }
  patterns.add(JSON.stringify(modules));
}
assert.equal(patterns.size,42,'Every personality gets its own QR pattern');
assert.throws(()=>context.window.GameCardQR.draw({},base,0,0,16),/area too small/);
console.log('Verified 42 distinct personality QR codes: public URL/sharecode preserved, gift parsing, integer modules, four-module quiet zone, export bounds and undersized-area rejection.');
