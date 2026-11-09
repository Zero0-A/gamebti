'use strict';
window.GameCollection=(()=>{
  const key='gamebti-collection-v2';
  const valid=(code,types)=>typeof code==='string'&&Object.prototype.hasOwnProperty.call(types,code);
  function create(types,getStorage){
    const entries={};
    function load(){try{const saved=JSON.parse(getStorage().getItem(key));if(saved?.version===1&&saved.entries&&typeof saved.entries==='object'){for(const [code,value]of Object.entries(saved.entries)){if(valid(code,types)&&value&&(value.self===true||value.friend===true))entries[code]={self:entries[code]?.self===true||value.self===true,friend:entries[code]?.friend===true||value.friend===true};}}}catch{}}
    load();
    return {
      has:code=>valid(code,types)&&Object.prototype.hasOwnProperty.call(entries,code),
      codes:()=>Object.keys(types).filter(code=>Object.prototype.hasOwnProperty.call(entries,code)),
      source:code=>entries[code]?{...entries[code]}:{self:false,friend:false},
      unlock(code,source){
        if(!valid(code,types)||!['self','friend'].includes(source))throw Error('Invalid collection entry');
        load();
        const added=!Object.prototype.hasOwnProperty.call(entries,code);
        entries[code]={self:false,friend:false,...entries[code],[source]:true};
        let persisted=true;try{getStorage().setItem(key,JSON.stringify({version:1,entries}));}catch{persisted=false;}
        return {added,persisted};
      }
    };
  }
  function parseGift(hash,types){try{const params=new URLSearchParams(hash.replace(/^#/,''));if(params.getAll('meet').length!==1)return null;const code=params.get('meet');return valid(code,types)?code:null;}catch{return null;}}
  function giftURL(base,code,types){if(!valid(code,types))throw Error('Invalid personality');const url=new URL(base);url.hash=new URLSearchParams({meet:code}).toString();return url.href;}
  return {create,parseGift,giftURL};
})();
