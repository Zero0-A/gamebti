import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const context={window:{}};
vm.runInNewContext(readFileSync(new URL('./dist/data.js',import.meta.url),'utf8'),context);
const codes=Object.keys(context.window.GameData.types),dir=new URL('./dist/assets/characters/',import.meta.url);
assert.deepEqual(readdirSync(dir).sort(),codes.map(code=>code+'.webp').sort(),'Every personality must have exactly one independent illustration');
const hashes=new Set();
for(const code of codes){
  const data=readFileSync(new URL(code+'.webp',dir));
  assert.equal(data.toString('ascii',0,4),'RIFF',code+' must be WebP');
  assert.equal(data.toString('ascii',8,16),'WEBPVP8L',code+' must retain lossless encoding');
  assert.equal(data[20],0x2f,code+' has an invalid lossless WebP header');
  const header=data.readUInt32LE(21),width=(header&0x3fff)+1,height=((header>>>14)&0x3fff)+1;
  assert.ok(width>=1024&&height>=1024,code+' must contain a full-size individual illustration');
  assert.equal(width,height,code+' must use the common square canvas');
  assert.ok((header>>>28)&1,code+' must retain an alpha channel');
  const hash=createHash('sha256').update(data).digest('hex');
  assert.ok(!hashes.has(hash),code+' accidentally reuses another personality image');
  hashes.add(hash);
}
console.log('Verified 42 distinct, independent, full-size RGBA personality illustrations.');
