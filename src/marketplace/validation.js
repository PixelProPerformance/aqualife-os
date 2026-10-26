export const TERMS_VERSION = 'marketplace-2026-10-26';
export function cnpjValido(value) {
 if (typeof value !== 'string' || !/^[\d.\-/\s]+$/.test(value)) return false;
 const s=value.replace(/\D/g,'');
 if(!/^\d{14}$/.test(s)||/^(\d)\1{13}$/.test(s)) return false;
 for(const n of [12,13]) {
  let weight=n===12?5:6,sum=0;
  for(let i=0;i<n;i++){sum+=Number(s[i])*weight;weight=weight===2?9:weight-1;}
  const rem=sum%11;
  if(Number(s[n])!==(rem<2?0:11-rem)) return false;
 }
 return true;
}
export function perfilValido(body) {
 const limits={legal_name:180,trade_name:160,contact_name:120,contact_email:180,contact_phone:30,zip_code:9,street:180,number:30,city:100,state:2};
 const result={};
 for(const [key,max] of Object.entries(limits)) {
  const value=body?.[key];
  if(typeof value!=='string'||!value.trim()||value.trim().length>max||/[\x00-\x1f]/.test(value)) return null;
  result[key]=value.trim();
 }
 result.state=result.state.toUpperCase();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contact_email)||!/^\d{5}-?\d{3}$/.test(result.zip_code)||!/^\+?[\d ()-]{10,30}$/.test(result.contact_phone)||!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(result.state)) return null;
 return result;
}
