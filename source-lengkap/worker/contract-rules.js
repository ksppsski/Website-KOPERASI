import {Problem} from './membership.js';
const MONTHS=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
export function agreementRules(value){
 const agreementDate=String(value||''),d=new Date(agreementDate+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(agreementDate)||!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==agreementDate||d.getUTCFullYear()<1900||d.getUTCFullYear()>9998)throw new Problem(400,'Tanggal akad tidak valid.');
 const month=d.getUTCMonth()+1,year=d.getUTCFullYear();
 const code=`SPK-SKI-MRBH-${month}/${MONTHS[month-1]}/${year}`;
 d.setUTCDate(d.getUTCDate()+10);if(d.getUTCDate()===31)d.setUTCDate(d.getUTCDate()+1);const effectiveDate=d.toISOString().slice(0,10);
 d.setUTCDate(d.getUTCDate()+365);const endDate=d.toISOString().slice(0,10);
 return {agreementDate,code,effectiveDate,endDate};
}
