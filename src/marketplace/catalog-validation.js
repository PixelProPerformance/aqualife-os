export function gtinValido(s) {
 if(typeof s!=='string'||! /^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(s)||/^0+$/.test(s))return false;
 let sum=0,w=3;
 for(let i=s.length-2;i>=0;i--){sum+=Number(s[i])*w;w=w===3?1:3;}
 return (10-sum%10)%10===Number(s.at(-1));
}
export function textoCampo(value,max,{min=0}={}){
 if(typeof value!=='string')return null;
 const s=value.trim();return s.length>=min&&s.length<=max&&!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(s)?s:null;
}
export function produtoValido(body){
 const p={};
 for(const [k,max,min] of [['title',180,3],['description',3000,10],['category',80,2],['brand',120,0],['model',120,0]]){
  p[k]=textoCampo(body?.[k]??'',max,{min});if(p[k]===null)return null;
 }
 p.gtin=textoCampo(body?.gtin??'',14);if(p.gtin===null||(p.gtin&&!gtinValido(p.gtin)))return null;
 return p;
}
export function ofertaValida(body){
 const sku=textoCampo(body?.seller_sku,100,{min:1}),variant=textoCampo(body?.variant_label??'',120);
 if(!sku||variant===null||!Number.isSafeInteger(body?.price_cents)||body.price_cents<1||body.price_cents>100000000)return null;
 return {seller_sku:sku,variant_label:variant,price_cents:body.price_cents};
}
