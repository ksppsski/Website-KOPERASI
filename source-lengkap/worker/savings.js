import {Problem,stmt} from './membership.js';

export const BASIC=100000, MONTHLY=10000;
export const localDate=(now=new Date())=>new Date(now.getTime()+8*3600000).toISOString().slice(0,10);
export function dueDate(anchor,offset){
 const [y,m,d]=anchor.split('-').map(Number),day=new Date(Date.UTC(y,m-1+offset,1,12));
 day.setUTCDate(Math.min(d,new Date(Date.UTC(day.getUTCFullYear(),day.getUTCMonth()+1,0)).getUTCDate()));
 return day.toISOString().slice(0,10);
}
// Money received is immutable. Monthly allocation reduces prepaid credit, never
// erases the member's accumulated savings. The schedule is derived from the
// original registration anniversary, so missed visits cannot skip or double bill.
export function calculateSavings(profile,credits,today=localDate()){
 if(!profile)return {active:false,status:'Belum terdaftar',basic:0,paid:0,allocated:0,remaining:0,arrears:0,total:0,low:false,history:[],periods:[]};
 const anchor=localDate(new Date(profile.created_at));
 const [y,m]=today.split('-').map(Number),[ay,am]=anchor.split('-').map(Number);
 let months=Math.max(0,(y-ay)*12+m-am);if(dueDate(anchor,months)>today)months--;
 const periods=Array.from({length:Math.max(0,months+1)},(_,i)=>({id:profile.id+':'+i,date:dueDate(anchor,i),amount:MONTHLY}));
 const received=credits.filter(c=>localDate(new Date(c.accepted_at))<=today);
 const basic=received.reduce((n,c)=>n+c.basic,0),paid=received.reduce((n,c)=>n+c.mandatory,0),other=received.reduce((n,c)=>n+c.other,0);
 const required=periods.length*MONTHLY,remaining=Math.max(0,paid-required),arrears=Math.max(0,required-paid),allocated=Math.min(paid,required);
 let available=paid;for(const p of periods){p.allocated=Math.min(available,MONTHLY);p.status=p.allocated===MONTHLY?'Terpenuhi':'Belum terpenuhi';available-=p.allocated;}
 const active=profile.status==='approved'&&basic>=BASIC&&arrears===0;
 return {active,status:active?'Aktif':'Tidak aktif',basic,paid,other,allocated,remaining,arrears,total:basic+paid+other,low:profile.status==='approved'&&remaining<=30000,anchor,nextDue:dueDate(anchor,Math.max(0,months+1)),coveredUntil:paid>=MONTHLY?dueDate(anchor,Math.floor(paid/MONTHLY)):null,monthly:MONTHLY,history:received.map(c=>({id:c.source_id,kind:c.source_kind,at:c.accepted_at,basic:c.basic,mandatory:c.mandatory,other:c.other})),periods};
}
export function creditStatement(env,owner,kind,row){
 const d=kind==='registration'?JSON.parse(row.data):null;
 const basic=d?Number(d.basic||0):0,mandatory=d?Number(d.monthly||0)*(d.paymentOption==='Tahunan'?12:1):row.amount;
 const other=d?Number(d.transactionSaving||0)+(d.special==='Ya'?Math.ceil(Number(d.specialAmount||0)/(d.specialPayment==='Angsur'?Math.max(1,Number(d.installments||1)):1)):0):0;
 return stmt(env,`INSERT INTO savings_credits (owner,source_kind,source_id,basic,mandatory,other,accepted_at)
 SELECT ?,?,?,?,?,?,checked_at FROM finance_reconciliations WHERE owner=? AND target_kind=? AND target_id=? AND proof_key=? AND status='approved'
 ON CONFLICT(owner,source_kind,source_id) DO NOTHING`,owner,kind,row.id,basic,mandatory,other,owner,kind,row.id,row.proof_key);
}
export async function savingsState(env,owner,profile){
 if(!profile)return calculateSavings(null,[]);
 // Bounded lazy import of older reconciled receipts; each source is credited once.
 const statements=[creditStatement(env,owner,'registration',profile)];
 const rows=(await stmt(env,"SELECT r.* FROM workflow_requests r JOIN finance_reconciliations f ON f.owner=r.owner AND f.target_id=r.id AND f.target_kind='savings' AND f.status='approved' AND f.proof_key=r.proof_key LEFT JOIN savings_credits c ON c.owner=r.owner AND c.source_kind='savings' AND c.source_id=r.id WHERE r.owner=? AND r.kind='savings' AND c.source_id IS NULL",owner).all()).results;
 statements.push(...rows.map(r=>creditStatement(env,owner,'savings',r)));
 for(let i=0;i<statements.length;i+=40)await env.DB.batch(statements.slice(i,i+40));
 const credits=(await stmt(env,'SELECT * FROM savings_credits WHERE owner=? ORDER BY accepted_at,source_id',owner).all()).results;
 return calculateSavings(profile,credits);
}
export async function requireActiveSavings(env,owner,profile){
 const savings=await savingsState(env,owner,profile);
 if(!savings.active)throw new Problem(409,'Simpanan belum aktif. Lengkapi pendaftaran dan setoran simpanan wajib melalui Simpanan Saya; tunggu rekonsiliasi Finance.');
 return savings;
}
