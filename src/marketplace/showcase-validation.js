import {textoCampo} from './catalog-validation.js';
export function attributesValid(value={}) {
 if(!value||Array.isArray(value)||typeof value!=='object'||Object.keys(value).length>20)return null;
 const result=Object.create(null);
 for(const [key,valueText] of Object.entries(value)){
  const k=textoCampo(key,60,{min:1}),v=textoCampo(valueText,240,{min:1});
  if(!k||!v||['__proto__','constructor','prototype'].includes(k))return null;
  result[k]=v;
 }
 return result;
}
export function conditionsValid(body){
 const warranty=textoCampo(body?.warranty,1000,{min:3}),conditions=textoCampo(body?.conditions,2000,{min:3});
 if(!warranty||!conditions||!Number.isInteger(body?.handling_days)||body.handling_days<0||body.handling_days>60)return null;
 return {warranty,conditions,handling_days:body.handling_days};
}
export const rankingPolicy='Disponibilidade primeiro; depois menor preço do produto, menor prazo de preparo e identificador da oferta. Frete não calculado. Sem preferência pela Aqualife. Vendas bloqueadas.';
